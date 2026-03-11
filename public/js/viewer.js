(function () {
  const toggle = document.getElementById('theme-toggle');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  const hljsDark = document.getElementById('hljs-dark');
  const hljsLight = document.getElementById('hljs-light');

  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    if (iconSun && iconMoon) {
      iconSun.classList.toggle('hidden', !dark);
      iconMoon.classList.toggle('hidden', dark);
    }
    if (hljsDark && hljsLight) {
      hljsDark.disabled = !dark;
      hljsLight.disabled = dark;
    }
  }

  const stored = localStorage.getItem('theme');
  const prefersDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(prefersDark);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const isDark = !document.documentElement.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      applyTheme(isDark);
    });
  }
})();
