from pathlib import Path

HTML = Path('admin-prenotazioni-barche.html')
JS = Path('boat-booking-admin.js')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Anchor not found: {label}')
    return text.replace(old, new, 1)

# HTML/CSS: hidden must always win over display:grid; dashboard starts inert.
s = HTML.read_text(encoding='utf-8')
s = replace_once(
    s,
    '    .admin-secondary-sections {\n      display: grid;\n      gap: 14px;\n    }',
    '    .admin-dashboard[hidden],\n    .admin-login[hidden] { display: none !important; }\n\n    .admin-secondary-sections {\n      display: grid;\n      gap: 14px;\n    }',
    'hidden visibility css'
)
s = replace_once(
    s,
    '<section class="admin-dashboard" data-admin-dashboard hidden>',
    '<section class="admin-dashboard" data-admin-dashboard hidden inert aria-hidden="true">',
    'dashboard initial inert state'
)
HTML.write_text(s, encoding='utf-8')

# JS: centralize authenticated/unauthenticated UI state.
j = JS.read_text(encoding='utf-8')
j = replace_once(
    j,
    "  const loginStatus = document.querySelector('[data-login-status]');\n",
    "  const loginStatus = document.querySelector('[data-login-status]');\n  const loginSection = loginForm.closest('.admin-login');\n",
    'login section selector'
)

anchor = '''  function setText(node, message = '', kind = '') {\n    if (!node) return;\n    node.textContent = message;\n    node.className = `booking-status${kind ? ` is-${kind}` : ''}`;\n  }\n'''
replacement = anchor + '''\n  function showLogin(message = '') {\n    credentials = null;\n    if (loginSection) loginSection.hidden = false;\n    dashboard.hidden = true;\n    dashboard.inert = true;\n    dashboard.setAttribute('aria-hidden', 'true');\n    if (message) setText(loginStatus, message, 'error');\n    window.requestAnimationFrame(() => loginForm.elements.username?.focus());\n  }\n\n  function showDashboard() {\n    if (loginSection) loginSection.hidden = true;\n    dashboard.hidden = false;\n    dashboard.inert = false;\n    dashboard.removeAttribute('aria-hidden');\n  }\n'''
j = replace_once(j, anchor, replacement, 'auth view helpers')

j = replace_once(
    j,
    '''    if (!response.ok) {\n      const error = new Error(body.error || 'Operazione non riuscita.');\n      error.code = body.code;\n      throw error;\n    }\n''',
    '''    if (!response.ok) {\n      const error = new Error(body.error || 'Operazione non riuscita.');\n      error.code = body.code;\n      error.status = response.status;\n      throw error;\n    }\n''',
    'preserve http status'
)

j = replace_once(
    j,
    '''      await adminRequest('login');\n      loginForm.closest('.admin-login').hidden = true;\n      dashboard.hidden = false;\n      await loadDashboard();\n    } catch (error) {\n      credentials = null;\n      setText(loginStatus, error.message, 'error');\n    }\n''',
    '''      await adminRequest('login');\n      showDashboard();\n      await loadDashboard();\n    } catch (error) {\n      showLogin(error.message);\n    }\n''',
    'login state switching'
)

j = replace_once(
    j,
    '''  refreshButton?.addEventListener('click', () => {\n    loadDashboard().catch((error) => setText(status, error.message, 'error'));\n  });\n''',
    '''  refreshButton?.addEventListener('click', () => {\n    loadDashboard().catch((error) => {\n      if (error.status === 401 || error.status === 403) {\n        showLogin('Sessione non valida. Effettua nuovamente l’accesso.');\n        return;\n      }\n      setText(status, error.message, 'error');\n    });\n  });\n''',
    'refresh auth failure handling'
)

# Explicitly establish the locked state on initial page load, regardless of browser restoration.
j = replace_once(
    j,
    "  loginForm.addEventListener('submit', async (event) => {\n",
    "  showLogin();\n\n  loginForm.addEventListener('submit', async (event) => {\n",
    'initial login state'
)

JS.write_text(j, encoding='utf-8')
