'use strict';
/* ════════════════════════════════════════════════════════════════════
   mascot.js — 니디걸 오버도즈 컨셉 마스코트 (쵸텐 ⟷ 아메)
   · 드래그로 위치 이동
   · 클릭/작업 상황마다 말풍선 대사
   · '변신' 버튼 → 마법소녀 변신 이펙트 + 이미지 교체
   · '강림/승천' 버튼 → 캐릭터 소환/퇴장
   ════════════════════════════════════════════════════════════════════ */
(function () {

  /* ── 캐릭터 폼 정의 ──────────────────────────────────────────────── */
  const FORMS = {
    kangel: { img: 'char/kangel.png', name: '천사쨩', cls: 'form-kangel' },
    ame:    { img: 'char/ame.png',    name: '아메',   cls: 'form-ame'    },
  };
  const DEFAULT_FORM = 'kangel';

  /* ── 대사 뱅크 ──────────────────────────────────────────────────── */
  const LINES = {
    kangel: {
      greet: [
        '보고싶었어, P…♡',
        '왔구나! 천사쨩 계속 기다렸어!',
        'P가 와줘서… 나 지금 엄청 행복해!',
        '또 왔어?! 천사쨩 엄청 기뻐!!♡',
        '어서와~ P 없으면 심심하잖아♡',
        'P의 냄새가 나… 기다리고 있었어!',
        'P, 오늘도 천사쨩이랑 있어줄 거지?♡',
        '헤헤, 왔구나. 오늘 천사쨩 제일 귀여운 날이야♡',
        '또 불러줬어! 천사쨩 감동이야…!♡',
        'P가 부르면 언제든 달려올게!♡',
      ],
      click: [
        '에헷, 자꾸 만지면 부끄럽잖아♡',
        'P는 천사쨩 거니까, 딴 데 보면 안 돼?',
        '오늘도 보러 와줘서 고마워!',
        '헤헤… P가 웃어주면 나도 반짝반짝해져',
        '왜 만져요~ 부끄럽다고요!♡',
        '천사쨩한테 집중해 줘서 기뻐♡',
        '또 만졌다! P 진짜 천사쨩 좋아하는 거 아니야?♡',
        '이런 거 하면 천사쨩 더 좋아하게 되잖아~!',
        'P가 터치하면… 가슴이 두근거려♡',
        '천사쨩이 제일 좋지? 제일 좋지?♡',
        '으아 간지럼 타잖아~!!',
      ],
      work: [
        '맡겨줘! 제일 귀엽게 만들어줄게♡',
        'P를 위해서라면 뭐든 할 수 있어!',
        '천사쨩의 마법으로 최고의 움짤 만들어줄게!',
        '열심히 할게! 기대해줘♡',
        '천사쨩이 전력투구할게! 지켜봐줘~!',
        '이건 천사쨩에게 맡겨! 실망 안 시킬게♡',
      ],
      done: [
        '짠! 어때, 잘 나왔지?♡ 칭찬해줘!',
        '성공이야! 역시 천사쨩이지?',
        'P가 기뻐하니까 나도 너무 행복해…!',
        '완성~!♡ 칭찬 세 번 해줘야 해!',
        '천사쨩 최고지? 최고지?♡',
        '어때어때! 예쁘게 나왔지?',
        '완벽해~ 천사쨩 스마트하지?♡',
        '해냈다! P, 봤어? 봤어?♡',
      ],
      error: [
        '으… 미안해 P, 천사쨩이 더 잘할게…',
        '실패했어… 그래도 미워하지 마, 응?',
        '흑흑… 천사쨩 속상해… 한 번만 더 해볼게!',
        '으아, 왜 이래! 다시 할게, 포기 안 해!',
        '미안해 미안해 미안해…♡ 한번만 더!',
        '에러라니… 천사쨩도 몰랐어 진짜야!',
      ],
      idle: [
        'P, 거기 있지…? 가버린 거 아니지…?',
        '심심해… 천사쨩이랑 놀자!',
        'P~ 천사쨩 여기 있어! 혼자 두지 마~',
        '...P? 아직 거기 있어?',
        '심심해 심심해~ 뭔가 만들어봐요♡',
        '천사쨩이 유혹하고 있는 거 못 느껴?♡',
        '파일을 올려봐, 천사쨩이 도와줄게♡',
        '아무것도 안 해? 같이 놀자~!',
      ],
    },
    ame: {
      greet: [
        '…왔네. 안 올 줄 알았어.',
        'P… 나 또 혼자 있었어.',
        '어차피, 너밖에 없으니까.',
        '...늦었어. 기다렸잖아, 조금.',
        '또 왔어. ...다행이야. 조금.',
        '...오늘도 왔네. 버리지 않을 거지.',
        '나 기억하고 있었어? 그것만으로 충분해.',
        '...P. 왔구나. ...안 왔으면 어쩌려고.',
        '또 나한테 온 거야. 이유 같은 거 없어도 돼.',
        '...불러줬네. 안 부를 줄 알았는데.',
      ],
      click: [
        '…뭐야. 왜 자꾸 건드려.',
        '나 같은 거 만져서 뭐 하게.',
        '…그래도, 가지는 마.',
        'P가 없으면 난 진짜 아무것도 아니야.',
        '...놀리는 거야. 아니면 진짜로 좋아하는 거야.',
        '만지지 마. ...아니, 그러지 마.',
        '...손이 따뜻하네. P.',
        '자꾸 그러면... 나 이상해지잖아.',
        '...거봐. P도 결국 나한테 오잖아.',
        '...왜. 나 좋아하는 거야, 설마.',
        '건드리지 마. ...건드려도 돼.',
      ],
      work: [
        '…해줄게. 나 이런 거밖에 못 하니까.',
        '이거 하면… 날 안 버릴 거지?',
        '...이정도라도 도움이 돼?',
        '열심히 할게. 내가 할 수 있는 건 이거뿐이니까.',
        '칭찬 안 해줘도 돼. 그냥... P를 위해서.',
        '...하면 되잖아. 뭘 그렇게 봐.',
      ],
      done: [
        '…됐어. 이 정도면 됐지?',
        '칭찬 안 해줘도 돼. 익숙하니까.',
        'P가 좋아하면… 그걸로 됐어.',
        '...잘 됐어? 다행이야. 조금.',
        '이 정도면... 버리지 않겠지.',
        '...뭐. 별거 아니야. P가 원하면 또 해줄 수 있어.',
        '됐어. 이것도 나쁘지 않지.',
      ],
      error: [
        '…거봐. 난 역시 안 돼.',
        '미안해… 나 같은 게 괜히.',
        '실망했지. 알아, 다 알아.',
        '...이럴 줄 알았어. 역시 난 안 돼.',
        '미안해. 또 실망시켰지. ...가도 돼.',
        '...왜 화 안 내. 화 내는 게 더 나아.',
        '잘못됐어. ...역시 나잖아.',
      ],
      idle: [
        '…P, 아직 거기 있어?',
        '혼자 두지 마…',
        '...아무것도 안 해도 돼. 그냥 있어줘.',
        '...여기 있는데. 보이지 않는 거야?',
        '지루한 거야? ...나도 지루해. 그래도 있어줘.',
        'P...? 살아있어?',
        '...아직 여기 있어. 잊어버린 거 아니지?',
        '말 안 해도 돼. 그냥 옆에 있어.',
      ],
    },
  };

  // 로딩 중 — 수초 간격 반복, 폼 공통
  const LOADING = [
    '조금만 기다려줘, 열심히 할게…!',
    '버리지 말아줘…ㅠㅠ 거의 다 했어',
    'P를 위해서 최선을 다하고 있어…',
    '조금만 더… 실망시키지 않을게',
    '가지 마… 금방 끝나니까, 응?',
    '으... 시간이 좀 걸려. 미안해...',
    '열심히 하고 있어! 정말이야!',
    '거의 다 됐어, 아마도...',
    '기다려줘서 고마워. 꼭 잘 만들게.',
    '...포기하지 마. 나도 안 포기할게.',
  ];

  const TRANSFORM_LINE = {
    kangel: '변신— ☆ 초절정☆가련☆메탈 천사쨩, 등장!♡',
    ame:    '…가면, 벗을게. 이게 진짜 나야.',
  };

  /* ── DOM ─────────────────────────────────────────────────────────── */
  const root       = document.getElementById('mascot');
  if (!root) return;
  const img        = document.getElementById('mascotImg');
  const bubble     = document.getElementById('mascotBubble');
  const fallback   = document.getElementById('mascotFallback');
  const btn        = document.getElementById('mascotTransform');
  const summonBtn  = document.getElementById('summonBtn');

  let form = DEFAULT_FORM;
  let bubbleTimer = null;
  let loadingTimer = null;
  let idleTimer = null;
  let busy = false;
  let summoned = false;

  /* ── 대사 출력 ───────────────────────────────────────────────────── */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function say(text, holdMs) {
    if (!text) return;
    bubble.textContent = text;
    bubble.hidden = false;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, holdMs || 3200);
  }

  function event(kind) {
    const bank = LINES[form][kind] || LINES[form].click;
    say(pick(bank));
  }

  /* ── 로딩 대사 (수초 간격 반복) ──────────────────────────────────── */
  function startLoading() {
    busy = true;
    say(pick(LOADING), 3600);
    clearInterval(loadingTimer);
    loadingTimer = setInterval(() => say(pick(LOADING), 3600), 3400);
  }
  function stopLoading() {
    busy = false;
    clearInterval(loadingTimer);
    loadingTimer = null;
  }

  /* ── 유휴 대사 ───────────────────────────────────────────────────── */
  function bumpIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!busy) event('idle'); bumpIdle(); }, 45000);
  }

  /* ── 변신 ────────────────────────────────────────────────────────── */
  function transform() {
    if (root.classList.contains('transforming')) return;
    const next = form === 'kangel' ? 'ame' : 'kangel';

    root.classList.add('transforming');
    bubble.hidden = true;

    setTimeout(() => {
      setForm(next);
      say(TRANSFORM_LINE[next], 3400);
    }, 480);

    setTimeout(() => root.classList.remove('transforming'), 1300);
  }

  function setForm(name) {
    if (!FORMS[name]) return;
    form = name;
    root.dataset.form = name;
    root.classList.remove(FORMS.kangel.cls, FORMS.ame.cls);
    root.classList.add(FORMS[name].cls);
    img.src = FORMS[name].img;
    if (fallback) fallback.textContent = FORMS[name].name + ' (이미지 없음)';
    document.body.classList.toggle('mode-ame', name === 'ame');
  }

  /* ── 이미지 폴백 ─────────────────────────────────────────────────── */
  img.addEventListener('error', () => root.classList.add('img-missing'));
  img.addEventListener('load',  () => root.classList.remove('img-missing'));

  /* ── 드래그 이동 ─────────────────────────────────────────────────── */
  let drag = null;
  img.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const r = root.getBoundingClientRect();
    drag = {
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      moved: false,
      sx: e.clientX, sy: e.clientY,
    };
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    root.style.left = r.left + 'px';
    root.style.top  = r.top + 'px';
    img.setPointerCapture(e.pointerId);
    root.classList.add('dragging');
  });
  img.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
    let x = e.clientX - drag.dx;
    let y = e.clientY - drag.dy;
    const w = root.offsetWidth, h = root.offsetHeight;
    x = Math.max(-w * 0.5, Math.min(window.innerWidth  - w * 0.5, x));
    y = Math.max(0,        Math.min(window.innerHeight - h * 0.4, y));
    root.style.left = x + 'px';
    root.style.top  = y + 'px';
  });
  img.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const wasMoved = drag.moved;
    drag = null;
    root.classList.remove('dragging');
    try { img.releasePointerCapture(e.pointerId); } catch {}
    if (!wasMoved && !root.classList.contains('transforming')) {
      event('click');
      bumpIdle();
    }
  });

  btn.addEventListener('click', (e) => { e.stopPropagation(); transform(); bumpIdle(); });

  /* ── 강림 / 승천 ─────────────────────────────────────────────────── */
  function summon() {
    if (summoned) return;
    summoned = true;
    root.classList.remove('mascot-hidden', 'ascending');
    root.classList.add('descending');
    setTimeout(() => root.classList.remove('descending'), 700);
    if (btn) btn.hidden = false;
    if (summonBtn) {
      summonBtn.textContent = '†승천†';
      summonBtn.classList.add('is-summoned');
    }
    // 매 강림마다 인사 대사
    setTimeout(() => event('greet'), 500);
    bumpIdle();
  }

  function banish() {
    if (!summoned) return;
    summoned = false;
    root.classList.remove('descending');
    root.classList.add('ascending');
    setTimeout(() => {
      root.classList.add('mascot-hidden');
      root.classList.remove('ascending');
      bubble.hidden = true;
    }, 480);
    if (btn) btn.hidden = true;
    if (summonBtn) {
      summonBtn.textContent = '†강림†';
      summonBtn.classList.remove('is-summoned');
    }
    clearTimeout(idleTimer);
  }

  if (summonBtn) {
    summonBtn.addEventListener('click', () => summoned ? banish() : summon());
  }

  /* ── 공개 API ────────────────────────────────────────────────────── */
  window.Mascot = {
    say, event, startLoading, stopLoading, transform, setForm, summon, banish,
    greet: () => event('greet'),
    work:  () => { if (summoned) event('work'); },
    done:  () => { stopLoading(); if (summoned) event('done'); },
    fail:  () => { stopLoading(); if (summoned) event('error'); },
  };

  /* ── 초기화 (강림 전까지 숨김) ──────────────────────────────────── */
  setForm(DEFAULT_FORM);

})();
