(function () {
  const DEFAULT_NAME = "EndFare Tour & Travel's";

  function applyBranding(data) {
    const name = data.brandName || DEFAULT_NAME;
    document.querySelectorAll('.brand').forEach((brand) => {
      brand.querySelector('.brand-name').textContent = name;
      const logo = brand.querySelector('.brand-logo');
      const icon = brand.querySelector('.brand-icon');
      if (data.logoUrl) {
        logo.src = data.logoUrl;
        logo.hidden = false;
        icon.hidden = true;
      } else {
        logo.removeAttribute('src');
        logo.hidden = true;
        icon.hidden = false;
      }
    });
    document.title = document.title.replace(/[^|]*API Demo$/, `${name} API Demo`).trim();
  }

  window.refreshBranding = async function () {
    try {
      const res = await fetch('/api/branding');
      const data = await res.json();
      applyBranding(data);
      return data;
    } catch {
      return null;
    }
  };

  window.refreshBranding();
})();
