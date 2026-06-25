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
    kangel: {
      name: '천사쨩', cls: 'form-kangel',
      imgs: {
        default: 'char/choten_default.png',
        dere:    'char/choten_dere.png',
        angry:   'char/choten_angry.png',
        peace:   'char/choten_peace.png',
      },
    },
    ame: {
      name: '아메', cls: 'form-ame',
      imgs: {
        default: 'char/ame_default.png',
        dere:    'char/ame_dere.png',
        smoking: 'char/ame_smoking.png',
        yandere: 'char/ame_yandere.png',
      },
    },
  };
  const DEFAULT_FORM = 'kangel';

  /* ── 이벤트 → 이미지 바리에이션 매핑 ────────────────────────────── */
  const EVENT_IMG = {
    kangel: { greet:'dere',    click:'dere',    work:'peace',   done:'peace',  error:'angry',   idle:'default', transform:'peace'   },
    ame:    { greet:'dere',    click:'default', work:'smoking', done:'dere',   error:'yandere', idle:'smoking', transform:'default' },
  };

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
        'P, 천사쨩 지금 엄청 귀엽지? 인정해야 해♡',
        '움짤 많이 만들어! 천사쨩이 응원할게♡',
        'P는 지금 무슨 생각 해? 천사쨩 생각 하는 거지?♡',
        '헤헤~ 천사쨩 존재 자체가 기적이라고 생각 안 해?♡',
        '피곤하면 안 돼! 천사쨩이 있잖아♡',
        '딴 거 보지 마, 천사쨩한테만 집중해야지!',
        'P 요즘 잘 먹고 있어? 천사쨩 걱정된단 말이야~',
        '이따가도 천사쨩 불러줄 거지? 약속이야!',
        '움짤 완성되면 나한테도 보여줘! 제일 먼저 봐야 해♡',
        '천사쨩이 여기 있으면 뭐든 잘 될 것 같지 않아?♡',
        '쉬엄쉬엄 해, P! 몸이 먼저잖아~ 천사쨩이 걱정되잖아',
        'P, 웃어봐. 천사쨩은 P 웃는 거 좋거든♡',
        '헤헤, 오늘 하루 어때? 잘 되고 있어?',
        '천사쨩 오늘 최고로 귀여운 거 알지?♡ 알지?',
        '포기하면 안 돼! 천사쨩이 옆에 있잖아!',
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
        '...뭐 필요한 거야. 그냥 불렀어?',
        '비 오는 날엔... P 생각이 더 난다.',
        '아무 말 안 해도 돼. 그냥 여기 있을게.',
        '...P는 나 보면 뭔 생각 해. 궁금해서.',
        '요즘 잘 자고 있어? ...그래야 해.',
        '나, 여기 있는 거 알지. 언제든지.',
        '...이상하게 P 옆에 있으면 조용해지네.',
        '배고프면 뭔가 먹어. 나 때문에 굶으면 화 낼 거야.',
        '움짤이 뭐라고... 그래도 P가 좋아하니까.',
        '오늘 기분은 어때. ...나쁘지 않았으면 좋겠어.',
        '...P는 이런 거 왜 만들어. 재밌어?',
        '가끔은 쉬어. ...무리하는 거 티 난다고.',
        '...P가 없으면 여기 있을 이유도 없어.',
        '아무 이유 없어도 돼. 그냥 와.',
        '...말 걸어줘서, 다행이야.',
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
    kangel: '변신— ☆ 초절정☆귀염뽀짝☆천사쨩, 등장!♡',
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

  function setImg(variant) {
    const src = FORMS[form].imgs[variant] || FORMS[form].imgs.default;
    if (img.src.includes(src.split('/').pop())) return;
    img.src = src;
  }

  function event(kind) {
    setImg(EVENT_IMG[form]?.[kind] || 'default');
    const bank = LINES[form][kind] || LINES[form].click;
    say(pick(bank));
  }

  /* ── 로딩 대사 (수초 간격 반복) ──────────────────────────────────── */
  function startLoading() {
    busy = true;
    setImg(EVENT_IMG[form]?.work || 'default');
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
      setImg(EVENT_IMG[next]?.transform || 'default');
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
    img.src = FORMS[name].imgs.default;
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
    const vw = window.innerWidth, vh = window.innerHeight;
    // right/bottom 좌표계로 고정 — left/top 전환 없이 항상 같은 기준으로 계산
    const curRight  = vw - r.right;
    const curBottom = vh - r.bottom;
    root.style.left   = 'auto';
    root.style.top    = 'auto';
    root.style.right  = curRight  + 'px';
    root.style.bottom = curBottom + 'px';
    drag = {
      sx: e.clientX, sy: e.clientY,
      startRight: curRight, startBottom: curBottom,
      moved: false,
    };
    img.setPointerCapture(e.pointerId);
    root.classList.add('dragging');
  });
  img.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    const w = root.offsetWidth, h = root.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    // 오른쪽으로 이동 → right 감소, 아래로 이동 → bottom 감소
    let nr = drag.startRight  - dx;
    let nb = drag.startBottom - dy;
    nr = Math.max(-(w * 0.5), Math.min(vw - w * 0.5, nr));
    nb = Math.max(-(h * 0.6), Math.min(vh - h, nb));
    root.style.right  = nr + 'px';
    root.style.bottom = nb + 'px';
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
  // 모든 캐릭터 바리에이션 이미지 프리로드 (첫 교체 시 깜빡임 방지)
  Object.values(FORMS).forEach(f =>
    Object.values(f.imgs).forEach(src => { const pi = new Image(); pi.src = src; })
  );
  setForm(DEFAULT_FORM);

})();
