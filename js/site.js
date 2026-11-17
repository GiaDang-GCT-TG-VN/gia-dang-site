(function () {
  var KEY = 'gpd-lang';
  var body = document.body;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  function apply(lang) {
    body.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    var btns = document.querySelectorAll('.lang button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-set') === lang ? 'true' : 'false');
    }
  }

  var initial = read();
  if (initial !== 'en' && initial !== 'vi') initial = 'en';
  apply(initial);

  var toggles = document.querySelectorAll('.lang button');
  for (var j = 0; j < toggles.length; j++) {
    toggles[j].addEventListener('click', function () {
      var v = this.getAttribute('data-set');
      apply(v); save(v);
    });
  }

  // mark active nav item
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var links = document.querySelectorAll('.nav-inner a[href]');
  for (var k = 0; k < links.length; k++) {
    var href = (links[k].getAttribute('href') || '').toLowerCase();
    if (href === here || (here === '' && href === 'index.html')) {
      links[k].classList.add('active');
      links[k].setAttribute('aria-current', 'page');
    }
  }
})();
