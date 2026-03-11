import fs from 'node:fs'
import path from 'node:path'

function fail(message) {
  throw new Error(`[contract] ${message}`)
}

function loadSpec(serviceDir) {
  const specPath = path.resolve(
    process.cwd(),
    '..',
    serviceDir,
    'openapi.yaml'
  )

  if (!fs.existsSync(specPath)) {
    fail(`OpenAPI artifact not found: ${specPath}`)
  }

  const raw = fs.readFileSync(specPath, 'utf-8').trim()
  if (!raw.startsWith('{')) {
    fail('openapi.yaml is expected to be JSON-rendered OpenAPI artifact')
  }

  return JSON.parse(raw)
}

function assertPathMethod(spec, routePath, method) {
  const route = spec.paths?.[routePath]
  if (!route) fail(`Missing path: ${routePath}`)
  if (!route[method]) fail(`Missing method: ${method.toUpperCase()} ${routePath}`)
  return route[method]
}

function assertResponses(operation, expectedCodes, label) {
  for (const code of expectedCodes) {
    if (!operation.responses?.[code]) {
      fail(`Missing response ${code} for ${label}`)
    }
  }
}

function assertProblemJson(operation, code, label) {
  const content = operation.responses?.[code]?.content
  if (!content?.['application/problem+json']) {
    fail(`Missing application/problem+json for ${label} response ${code}`)
  }
}

function run() {
  const childrenSpec = loadSpec('user-children-service')
  const authSpec = loadSpec('auth-service')

  const createUser = assertPathMethod(childrenSpec, '/v1/user/users', 'post')
  assertResponses(createUser, ['201', '401', '403', '404', '409', '422'], 'POST /v1/user/users')
  for (const code of ['401', '403', '404', '409']) {
    assertProblemJson(createUser, code, 'POST /v1/user/users')
  }

  const listChildren = assertPathMethod(childrenSpec, '/v1/user/users/{user_id}/children', 'get')
  assertResponses(listChildren, ['200', '401', '403', '404', '409', '422'], 'GET /v1/user/users/{user_id}/children')

  const addChild = assertPathMethod(childrenSpec, '/v1/user/users/{user_id}/children', 'post')
  assertResponses(addChild, ['201', '401', '403', '404', '409', '422'], 'POST /v1/user/users/{user_id}/children')

  const updateChild = assertPathMethod(childrenSpec, '/v1/user/users/{user_id}/children/{child_id}', 'patch')
  assertResponses(updateChild, ['200', '401', '403', '404', '409', '422'], 'PATCH /v1/user/users/{user_id}/children/{child_id}')

  const deleteChild = assertPathMethod(childrenSpec, '/v1/user/users/{user_id}/children/{child_id}', 'delete')
  assertResponses(deleteChild, ['204', '401', '403', '404', '409', '422'], 'DELETE /v1/user/users/{user_id}/children/{child_id}')

  const addStory = assertPathMethod(childrenSpec, '/v1/user/users/{user_id}/children/{child_id}/stories', 'post')
  assertResponses(addStory, ['201', '401', '403', '404', '409', '422'], 'POST /v1/user/users/{user_id}/children/{child_id}/stories')

  const register = assertPathMethod(authSpec, '/v1/auth/register', 'post')
  assertResponses(register, ['201', '401', '403', '404', '409', '422'], 'POST /v1/auth/register')

  const login = assertPathMethod(authSpec, '/v1/auth/login', 'post')
  assertResponses(login, ['200', '401', '403', '404', '409', '422'], 'POST /v1/auth/login')
  assertProblemJson(login, '401', 'POST /v1/auth/login')

  const refresh = assertPathMethod(authSpec, '/v1/auth/refresh', 'post')
  assertResponses(refresh, ['200', '401', '403', '404', '409', '422'], 'POST /v1/auth/refresh')

  const logout = assertPathMethod(authSpec, '/v1/auth/logout', 'post')
  assertResponses(logout, ['204', '401', '403', '404', '409', '422'], 'POST /v1/auth/logout')

  console.log('[contract] user-web consumer contract checks passed')
}

run()
