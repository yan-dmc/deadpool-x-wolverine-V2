// animate a numeric CSS custom property (percentage value) on the body
function animateCSSVar(varName, toPercent, duration = 350, fromPercent = null, onComplete = null) {
  const body = document.body;
  // cancel previous animation for this variable only
  if (body.__varAnims && body.__varAnims[varName] && body.__varAnims[varName].raf) {
    cancelAnimationFrame(body.__varAnims[varName].raf);
  }
  // Determine start value: prefer explicit fromPercent, otherwise
  // if this is the first (no _themeInitialized) start from 50%,
  // otherwise use the computed current value.
  let from;
  if (fromPercent !== null) {
    from = parseFloat(fromPercent);
  } else if (!body.dataset._themeInitialized) {
    from = 50;
  } else {
    const style = getComputedStyle(body);
    const raw = style.getPropertyValue(varName).trim() || '50%';
    from = parseFloat(raw.replace('%', '')) || 50;
  }
  const to = parseFloat(toPercent);
  const start = performance.now();

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  if (!body.__varAnims) body.__varAnims = {};
  const anim = { raf: null };
  body.__varAnims[varName] = anim;

  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const eased = easeInOut(t);
    const current = from + (to - from) * eased;
    body.style.setProperty(varName, `${current}%`);
    if (t < 1) {
      anim.raf = requestAnimationFrame(frame);
    } else {
      // finished
      body.style.setProperty(varName, `${to}%`);
      // clear this var's anim handle
      if (body.__varAnims) delete body.__varAnims[varName];
      if (typeof onComplete === 'function') onComplete();
    }
  }

  anim.raf = requestAnimationFrame(frame);
}

function escolherTema(lado) {
  // ignore clicks on the currently selected side
  if (document.body.dataset.currentTheme === lado) return;
  // ignore if selection is locked until reset
  if (document.body.dataset.selectionLocked === '1') return;
  // ignore clicks while an animation is running
  if (document.body.dataset.animating === '1') return;

  const tema = `tema-${lado}`;
  document.body.classList.remove('tema-esquerdo', 'tema-direito');

  // determine targets for both gradient stops
  // Use tiny offsets (0.1 / 99.9) instead of exact 0/100 so gradient doesn't collapse
  const targetFirst = lado === 'esquerdo' ? 0.1 : 99.9;
  const targetSecond = 0.1;

  // determine 'from' values: on first interaction start from 50%, otherwise use computed current
  const body = document.body;
  let fromFirst, fromSecond;
  if (!body.dataset._themeInitialized) {
    fromFirst = 50;
    fromSecond = 50;
    body.dataset._themeInitialized = '1';
  } else {
    const style = getComputedStyle(body);
    const raw1 = style.getPropertyValue('--bg-primeira-cor').trim() || '50%';
    const raw2 = style.getPropertyValue('--bg-segunda-cor').trim() || '50%';
    fromFirst = parseFloat(raw1.replace('%', '')) || 50;
    fromSecond = parseFloat(raw2.replace('%', '')) || 50;
  }
  // apply theme class only after we read current CSS variable values
  document.body.classList.add(tema);

  // slide BOTH figures in the same direction
  const figs = document.querySelectorAll('#escolha figure');
  const slideClass = lado === 'esquerdo' ? 'slide-out-right' : 'slide-out-left';

  // apply slide class to both figures
  figs.forEach(f => {
    f.classList.remove('slide-out-left', 'slide-out-right');
    f.classList.add(slideClass);
  });

  // slide up and hide the "vs" element (if present)
  const vsEl = document.querySelector('.vs') || document.getElementById('vs');
  if (vsEl) {
    // Ensure visible -> then animate to hidden
    vsEl.style.visibility = '';
    // clear any pending hide timeout
    if (vsEl.__hideTimeout) { clearTimeout(vsEl.__hideTimeout); delete vsEl.__hideTimeout; }
    // trigger reflow then add hidden class to animate
    void vsEl.offsetWidth;
    vsEl.classList.add('vs-hidden');
    // after transition complete, set visibility:hidden to remove from a11y/flow
    vsEl.__hideTimeout = setTimeout(() => {
      vsEl.style.visibility = 'hidden';
      delete vsEl.__hideTimeout;
    }, 360);
  }

  // hide the h2 element
  const h2El = document.querySelector('#escolha-tema h2');
  if (h2El) {
    h2El.style.visibility = '';
    if (h2El.__hideTimeout) { clearTimeout(h2El.__hideTimeout); delete h2El.__hideTimeout; }
    void h2El.offsetWidth;
    h2El.classList.add('h2-hidden');
    h2El.__hideTimeout = setTimeout(() => {
      h2El.style.visibility = 'hidden';
      delete h2El.__hideTimeout;
    }, 360);
  }

  // mark animating and add class to show visual disabled state
  body.dataset.animating = '1';
  body.classList.add('animating');

  // animate both gradient variables in parallel and wait for both to finish
  let finished = 0;
  function step() {
    finished += 1;
    if (finished === 2) {
      delete body.dataset.animating;
      body.classList.remove('animating');
      body.dataset.currentTheme = lado;
      // lock further selections until reset button is used
      document.body.dataset.selectionLocked = '1';

      // Wait for exit animations to complete before hiding the section (360ms for transitions)
      setTimeout(() => {
        const escolhaSection = document.getElementById('escolha-tema');
        if (escolhaSection) escolhaSection.classList.add('hidden');
      }, 360);

      // show the appropriate theme section
      const wolverineSection = document.getElementById('wolverine-tema');
      const deadpoolSection = document.getElementById('deadpool-tema');
      if (lado === 'esquerdo') {
        if (wolverineSection) {
          wolverineSection.classList.remove('hidden', 'exit-complete');
        }
        if (deadpoolSection) {
          deadpoolSection.classList.add('hidden');
          setTimeout(() => deadpoolSection.classList.add('exit-complete'), 600);
        }
      } else {
        if (wolverineSection) {
          wolverineSection.classList.add('hidden');
          setTimeout(() => wolverineSection.classList.add('exit-complete'), 600);
        }
        if (deadpoolSection) {
          deadpoolSection.classList.remove('hidden', 'exit-complete');
        }
      }
      const btn = document.getElementById('resetEscolha');
      if (btn) btn.classList.remove('hidden');
    }
  }

  animateCSSVar('--bg-primeira-cor', targetFirst, 350, fromFirst, step);
  animateCSSVar('--bg-segunda-cor', targetSecond, 350, fromSecond, step);
}

// Ao carregar o site
window.onload = () => {
  // Always start from the default baseline on page load; do not persist theme.
  document.body.classList.remove('tema-esquerdo');
  document.body.classList.remove('tema-direito');

  // Habilitar interações após animações de entrada terminarem (800ms animation + 200ms delay = 1000ms)
  setTimeout(() => {
    document.body.classList.add('animations-complete');
  }, 300);

  initTrailerCarousel();
};

function initTrailerCarousel() {
  const section = document.getElementById('trailer-tema');
  if (!section) return;

  const items = Array.from(section.querySelectorAll('.trailer-item'));
  const prevBtn = document.getElementById('trailer-prev');
  const nextBtn = document.getElementById('trailer-next');

  if (!items.length || !prevBtn || !nextBtn) return;

  let current = 0;
  const total = items.length;

  const normalize = (index) => (index + total) % total;

  function render() {
    items.forEach((item) => {
      item.classList.remove('is-left', 'is-center', 'is-right');
    });

    const left = normalize(current - 1);
    const right = normalize(current + 1);

    items[current].classList.add('is-center');
    items[left].classList.add('is-left');
    items[right].classList.add('is-right');
  }

  prevBtn.addEventListener('click', () => {
    current = normalize(current - 1);
    render();
  });

  nextBtn.addEventListener('click', () => {
    current = normalize(current + 1);
    render();
  });

  items.forEach((item, index) => {
    item.addEventListener('click', () => {
      if (index === current) return;
      current = index;
      render();
    });
  });

  render();
}

// Restore button implementation (clean)
function restaurarEscolhas() {
  // Verifica se há um tema selecionado antes de prosseguir
  if (!document.body.dataset.currentTheme || document.body.dataset.selectionLocked !== '1') {
    return; // Não faz nada se não houver tema selecionado
  }

  if (document.body.dataset.animating === '1') return;
  const btn = document.getElementById('resetEscolha');
  if (btn) btn.disabled = true;

  // Desabilitar interações durante o reset
  document.body.classList.remove('animations-complete');

  // First trigger exit animations for theme sections
  const wolverineSection = document.getElementById('wolverine-tema');
  const deadpoolSection = document.getElementById('deadpool-tema');

  if (wolverineSection && !wolverineSection.classList.contains('hidden')) {
    wolverineSection.classList.add('hidden');
  }
  if (deadpoolSection && !deadpoolSection.classList.contains('hidden')) {
    deadpoolSection.classList.add('hidden');
  }

  // Wait for exit animations to complete before continuing
  setTimeout(() => {
    // Add exit-complete to fully hide
    if (wolverineSection) wolverineSection.classList.add('exit-complete');
    if (deadpoolSection) deadpoolSection.classList.add('exit-complete');

    // Immediately restore figures' position/visibility in case they were slid out
    const figs = document.querySelectorAll('#escolha figure');
    if (figs && figs.length >= 2) {
      figs.forEach(f => {
        f.classList.remove('slide-out-left', 'slide-out-right');
        f.style.opacity = '';
        f.style.marginLeft = '';
        f.style.visibility = '';
      });
    }

    document.body.dataset.animating = '1';
    document.body.classList.add('animating');

    let done = 0;
    function step() {
      done += 1;
      if (done === 2) {
        // after variables reached 50%, remove theme classes so :root/default applies
        document.body.classList.remove('tema-esquerdo', 'tema-direito');
        delete document.body.dataset.currentTheme;
        delete document.body.dataset.selectionLocked;

        delete document.body.dataset.animating;
        document.body.classList.remove('animating');
        delete document.body.dataset._themeInitialized;
        // ensure figures visible
        const figs2 = document.querySelectorAll('#escolha figure');
        if (figs2 && figs2.length >= 2) {
          figs2.forEach(f => {
            f.classList.remove('slide-out-left', 'slide-out-right');
            f.style.opacity = '';
            f.style.marginLeft = '';
            f.style.transform = '';
            f.style.visibility = '';
          });
        }
        // show selection section again
        const escolhaSection = document.getElementById('escolha-tema');
        if (escolhaSection) escolhaSection.classList.remove('hidden');

        // restore vs and h2 visibility
        const vsEl = document.querySelector('.vs');
        if (vsEl) {
          vsEl.classList.remove('vs-hidden');
          vsEl.style.visibility = '';
          vsEl.style.animation = '';
          if (vsEl.__hideTimeout) { clearTimeout(vsEl.__hideTimeout); delete vsEl.__hideTimeout; }
        }
        const h2El = document.querySelector('#escolha-tema h2');
        if (h2El) {
          h2El.classList.remove('h2-hidden');
          h2El.style.visibility = '';
          h2El.style.animation = '';
          if (h2El.__hideTimeout) { clearTimeout(h2El.__hideTimeout); delete h2El.__hideTimeout; }
        }

        // Hide button and reset
        if (btn) { btn.classList.add('hidden'); btn.disabled = false; }

        // Reabilitar interações após as animações de entrada reaparecerem
        setTimeout(() => {
          document.body.classList.add('animations-complete');
        }, 300);
      }
    }

    console.log('restaurarEscolhas: starting animations to 50%');
    animateCSSVar('--bg-primeira-cor', 50, 350, null, step);
    animateCSSVar('--bg-segunda-cor', 50, 350, null, step);

    // show the "vs" element again (undo the slide-up)
    const vsEl2 = document.querySelector('.vs') || document.getElementById('vs');
    if (vsEl2) {
      if (vsEl2.__hideTimeout) { clearTimeout(vsEl2.__hideTimeout); delete vsEl2.__hideTimeout; }
      // make visible immediately and remove the hidden class to animate back in
      vsEl2.style.visibility = '';
      // small delay to ensure the browser processes visibility change
      setTimeout(() => vsEl2.classList.remove('vs-hidden'), 20);
    }
  }, 600); // Reduced delay for smoother transition
}


// Função para navegar entre abas
function navegarAba(aba) {
  console.log('===== navegarAba chamada com:', aba);

  // Obter referências de todas as seções
  const escolhaSection = document.getElementById('escolha-tema');
  const wolverineSection = document.getElementById('wolverine-tema');
  const deadpoolSection = document.getElementById('deadpool-tema');
  const sobreSection = document.getElementById('sobre-tema');
  const trailerSection = document.getElementById('trailer-tema');

  console.log('Elementos encontrados:');
  console.log('- escolhaSection:', escolhaSection);
  console.log('- sobreSection:', sobreSection);
  console.log('- trailerSection:', trailerSection);

  // CASO 1: Clicou em "inicio"
  if (aba === 'inicio') {
    console.log('Navegando para inicio');

    // Animar saída do sobre e trailer
    if (sobreSection && !sobreSection.classList.contains('hidden')) {
      sobreSection.classList.add('exiting');
      setTimeout(() => {
        sobreSection.classList.add('hidden');
        sobreSection.classList.remove('exiting');
        sobreSection.style.display = '';
      }, 400);
    }
    if (trailerSection && !trailerSection.classList.contains('hidden')) {
      trailerSection.classList.add('exiting');
      setTimeout(() => {
        trailerSection.classList.add('hidden');
        trailerSection.classList.remove('exiting');
        trailerSection.style.display = '';
      }, 400);
    }

    // Se há um tema selecionado (Wolverine ou Deadpool), usar a função restaurarEscolhas
    if (document.body.dataset.currentTheme && document.body.dataset.selectionLocked === '1') {
      setTimeout(() => restaurarEscolhas(), 400);
    } else {
      // Caso contrário, apenas mostrar escolha-tema e esconder tudo
      setTimeout(() => {
        if (wolverineSection) {
          wolverineSection.classList.add('hidden');
          wolverineSection.classList.remove('exit-complete');
          setTimeout(() => wolverineSection.classList.add('exit-complete'), 420);
        }
        if (deadpoolSection) {
          deadpoolSection.classList.add('hidden');
          deadpoolSection.classList.remove('exit-complete');
          setTimeout(() => deadpoolSection.classList.add('exit-complete'), 420);
        }
        if (escolhaSection) {
          escolhaSection.classList.remove('hidden', 'exit-complete');
          escolhaSection.style.opacity = '';
          escolhaSection.style.transition = '';
        }
      }, 400);
    }
    return;
  }

  // CASO 2: Clicou em "sobre" ou "trailer"
  if (aba === 'sobre') {
    console.log('===== Navegando para SOBRE =====');

    const trailerWasVisible = trailerSection && !trailerSection.classList.contains('hidden');
    const trailerExitDelay = trailerWasVisible ? 200 : 0;

    // Disparar animação de saída do início usando .exiting
    if (escolhaSection && !escolhaSection.classList.contains('hidden')) {
      escolhaSection.classList.add('exiting');
    }
    if (wolverineSection && !wolverineSection.classList.contains('hidden')) {
      wolverineSection.classList.add('hidden');
      wolverineSection.classList.remove('exit-complete');
    }
    if (deadpoolSection && !deadpoolSection.classList.contains('hidden')) {
      deadpoolSection.classList.add('hidden');
      deadpoolSection.classList.remove('exit-complete');
    }

    // Aguardar animação de saída antes de mostrar sobre
    setTimeout(() => {
      // Finalizar ocultação após a animação do início
      if (escolhaSection) {
        escolhaSection.classList.add('hidden');
        escolhaSection.classList.remove('exiting');
      }
      if (wolverineSection) wolverineSection.classList.add('exit-complete');
      if (deadpoolSection) deadpoolSection.classList.add('exit-complete');
      
      // Animar saída do trailer se estiver visível
      if (trailerWasVisible) {
        trailerSection.classList.add('exiting');
        setTimeout(() => {
          trailerSection.classList.add('hidden');
          trailerSection.classList.remove('exiting');
        }, 400);
      }

      // Mostrar sobre com animação de entrada (com delay após saída do trailer)
      setTimeout(() => {
        if (sobreSection) {
          sobreSection.classList.remove('hidden', 'exiting');
          sobreSection.style.display = 'flex';
          
          // Inicializar o slider após a animação começar
          setTimeout(() => {
            if (typeof initializeSlider === 'function') {
              console.log('Inicializando slider...');
              initializeSlider();
            }
          }, 100);
        }
      }, trailerExitDelay);
    }, 420);

  } else if (aba === 'trailer') {
    console.log('Navegando para trailer');

    // Disparar animação de saída do início usando .exiting
    if (escolhaSection && !escolhaSection.classList.contains('hidden')) {
      escolhaSection.classList.add('exiting');
    }
    if (wolverineSection && !wolverineSection.classList.contains('hidden')) {
      wolverineSection.classList.add('hidden');
      wolverineSection.classList.remove('exit-complete');
    }
    if (deadpoolSection && !deadpoolSection.classList.contains('hidden')) {
      deadpoolSection.classList.add('hidden');
      deadpoolSection.classList.remove('exit-complete');
    }
    
    // Animar saída do sobre se estiver visível
    if (sobreSection && !sobreSection.classList.contains('hidden')) {
      sobreSection.classList.add('exiting');
      setTimeout(() => {
        sobreSection.classList.add('hidden');
        sobreSection.classList.remove('exiting');
        sobreSection.style.display = '';
      }, 400);
    }

    // Mostrar trailer após a saída terminar
    setTimeout(() => {
      if (escolhaSection) {
        escolhaSection.classList.add('hidden');
        escolhaSection.classList.remove('exiting');
      }
      if (wolverineSection) wolverineSection.classList.add('exit-complete');
      if (deadpoolSection) deadpoolSection.classList.add('exit-complete');
      if (trailerSection) {
        trailerSection.classList.remove('hidden', 'exiting');
        trailerSection.style.display = 'flex';
      }
    }, 420);
  }

  console.log('===== navegarAba finalizada =====');
}


// Audio player - show popup on first play
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initializeSlider === 'function') {
    initializeSlider();
  }
  const audio = document.getElementById('tema-audio');
  let hasShownPopup = false;

  if (!audio) return;

  audio.addEventListener('play', () => {
    if (!hasShownPopup) {
      showMusicPopup();
      hasShownPopup = true;
    }
  });

  function showMusicPopup() {
    const popup = document.createElement('div');
    popup.className = 'music-popup';
    popup.innerHTML = `
      <h3>Like a Prayer</h3>
      <p>canção de Madonna</p>
    `;
    document.body.appendChild(popup);

    setTimeout(() => popup.classList.add('show'), 10);

    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 300);
    }, 3000);
  }
});



let sliderInitialized = false;
function initializeSlider() {
  if (sliderInitialized) return;
  sliderInitialized = true;
  const slider = document.querySelector('.slider');
  if (!slider) {
    console.error('Slider não encontrado!');
    return;
  }

  let items = document.querySelectorAll('.slider .projetosItem');
  let next = document.getElementById('next');
  let prev = document.getElementById('prev');
  
  if (!items.length || !next || !prev) {
    console.error('Elementos do slider não encontrados');
    return;
  }

  let isHover = false;
  let rotation = 185;
  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let isAnimating = true;

  function loadShow() {
    if (rotation >= 360 || rotation <= -360) {
      rotation = rotation % 360;
    }
    slider.style.transform = `perspective(3000px) rotateZ(5deg) rotateX(-2.5deg)rotateY(${rotation}deg) scale(1.2)`;
  }

  // Rotação automática contínua
  function animate() {
    if (isAnimating) {
      rotation += 0.05;
      loadShow();
    }
    requestAnimationFrame(animate);
  }
  
  // Inicia a animação
  animate();

  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      isHover = true;
      loadShow();
    });

    item.addEventListener('mouseleave', () => {
      isHover = false;
      loadShow();
    });
  });

  // Drag functionality
  slider.addEventListener('mousedown', function (e) {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    slider.style.cursor = 'grabbing';
    slider.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    
    e.preventDefault();
    currentX = e.clientX;
    const deltaX = currentX - startX;
    
    rotation += deltaX * 0.05;
    startX = currentX;
    loadShow();
  });

  document.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false;
      slider.style.cursor = 'grab';
      slider.style.userSelect = '';
    }
  });

  // Touch events
  slider.addEventListener('touchstart', function (e) {
    isDragging = true;
    startX = e.touches[0].clientX;
  }, { passive: false });

  slider.addEventListener('touchmove', function (e) {
    if (!isDragging) return;
    
    e.preventDefault();
    currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;
    
    rotation += deltaX * 0.05;
    startX = currentX;
    loadShow();
  }, { passive: false });

  slider.addEventListener('touchend', function () {
    isDragging = false;
  });

  // Mantém os botões como alternativa (opcional)
  let rotationInterval = null;

  // Botão next - roda enquanto pressionado
  prev.addEventListener('mousedown', function () {
    rotation += 3;
    loadShow();
    rotationInterval = setInterval(() => {
      rotation += 3;
      loadShow();
    }, 30);
  });

  prev.addEventListener('mouseup', function () {
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
  });

  prev.addEventListener('mouseleave', function () {
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
  });

  // Botão prev - roda enquanto pressionado
  next.addEventListener('mousedown', function () {
    rotation -= 3;
    loadShow();
    rotationInterval = setInterval(() => {
      rotation -= 3;
      loadShow();
    }, 30);
  });

  next.addEventListener('mouseup', function () {
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
  });

  next.addEventListener('mouseleave', function () {
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
  });

  // Inicializa o slider pela primeira vez
  loadShow();
}

  