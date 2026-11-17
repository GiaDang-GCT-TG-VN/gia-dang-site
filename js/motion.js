/* One-time reveal for research themes, repo cards and publication entries.
   Skipped entirely under prefers-reduced-motion; content is never hidden
   unless this script runs. */
(function () {
  if (!('IntersectionObserver' in window) || !window.matchMedia) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var items = document.querySelectorAll('.theme, .repo, .pub');
  if (!items.length) return;

  document.documentElement.classList.add('reveal-on');

  var io = new IntersectionObserver(function (entries) {
    var n = 0;
    for (var i = 0; i < entries.length; i++) {
      var el = entries[i].target;
      if (!entries[i].isIntersecting) continue;
      el.style.transitionDelay = (n++ * 60) + 'ms';
      el.classList.add('is-in');
      io.unobserve(el);
      el.addEventListener('transitionend', clearDelay);
    }
  }, { rootMargin: '0px 0px -6% 0px' });

  function clearDelay(e) {
    e.currentTarget.style.transitionDelay = '';
    e.currentTarget.removeEventListener('transitionend', clearDelay);
  }

  for (var j = 0; j < items.length; j++) io.observe(items[j]);
})();
