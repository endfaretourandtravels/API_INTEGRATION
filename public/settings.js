(function () {
  const form = document.getElementById('settings-form');
  const message = document.getElementById('message');
  const hint = document.getElementById('secret-hint');
  const secretInput = form.elements.clientSecret;
  const toggle = document.getElementById('toggle-secret');

  function showMessage(text, ok) {
    message.textContent = text;
    message.className = 'message ' + (ok ? 'ok' : 'error');
  }

  async function load() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      form.elements.baseUrl.value = data.baseUrl || '';
      form.elements.clientId.value = data.clientId || '';
      secretInput.value = '';
      secretInput.placeholder = data.hasSecret ? data.clientSecretMasked : 'Enter client secret';
      hint.textContent = data.hasSecret ? 'Leave blank to keep the current secret.' : '';
    } catch (err) {
      showMessage('Failed to load settings: ' + err.message, false);
    }
  }

  toggle.addEventListener('click', () => {
    const hidden = secretInput.type === 'password';
    secretInput.type = hidden ? 'text' : 'password';
    toggle.textContent = hidden ? 'Hide' : 'Show';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      baseUrl: form.elements.baseUrl.value.trim(),
      clientId: form.elements.clientId.value.trim(),
      clientSecret: secretInput.value.trim(),
    };
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      showMessage('Credentials saved successfully.', true);
      load();
    } catch (err) {
      showMessage(err.message, false);
    }
  });

  load();
})();

(function () {
  const MAX_BYTES = 2 * 1024 * 1024;
  const form = document.getElementById('branding-form');
  const preview = document.getElementById('logo-preview');
  const message = document.getElementById('branding-message');
  const fileInput = form.elements.logo;
  let pendingLogo = null;
  let removeLogo = false;

  function showMessage(text, ok) {
    message.textContent = text;
    message.className = 'message ' + (ok ? 'ok' : 'error');
  }

  function setPreview(src) {
    preview.textContent = '';
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Logo preview';
      preview.appendChild(img);
    } else {
      preview.textContent = 'No logo';
    }
  }

  async function load() {
    const data = await window.refreshBranding();
    if (!data) return showMessage('Failed to load branding', false);
    form.elements.brandName.value = data.brandName === data.defaultBrandName ? '' : data.brandName;
    form.elements.brandName.placeholder = data.defaultBrandName;
    setPreview(data.logoUrl);
    pendingLogo = null;
    removeLogo = false;
    fileInput.value = '';
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      fileInput.value = '';
      return showMessage('Logo must be 2 MB or smaller', false);
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingLogo = reader.result;
      removeLogo = false;
      setPreview(pendingLogo);
      showMessage('', true);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('remove-logo').addEventListener('click', () => {
    pendingLogo = null;
    removeLogo = true;
    fileInput.value = '';
    setPreview(null);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: form.elements.brandName.value.trim(),
          logo: pendingLogo,
          removeLogo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      showMessage('Branding saved successfully.', true);
      load();
    } catch (err) {
      showMessage(err.message, false);
    }
  });

  load();
})();
