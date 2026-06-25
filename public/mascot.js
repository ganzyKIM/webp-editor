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

  /* ── 로딩 중 이미지 (대사 없는 작업 상태) ──────────────────────── */
  const WORK_IMG = { kangel: 'peace', ame: 'smoking' };

  /* ── 대사 뱅크 (t: 텍스트, i: 이미지 바리에이션) ─────────────── */
  const LINES = {
    kangel: {
      greet: [
        { t:'보고싶었어, P…♡',                           i:'dere'    },
        { t:'왔구나! 천사쨩 계속 기다렸어!',               i:'dere'    },
        { t:'P가 와줘서… 나 지금 엄청 행복해!',            i:'dere'    },
        { t:'또 왔어?! 천사쨩 엄청 기뻐!!♡',              i:'dere'    },
        { t:'어서와~ P 없으면 심심하잖아♡',                i:'dere'    },
        { t:'P의 냄새가 나… 기다리고 있었어!',             i:'dere'    },
        { t:'P, 오늘도 천사쨩이랑 있어줄 거지?♡',         i:'dere'    },
        { t:'헤헤, 왔구나. 오늘 천사쨩 제일 귀여운 날이야♡', i:'peace' },
        { t:'또 불러줬어! 천사쨩 감동이야…!♡',            i:'dere'    },
        { t:'P가 부르면 언제든 달려올게!♡',               i:'peace'   },
      ],
      click: [
        { t:'P, 천사쨩 지금 엄청 귀엽지? 인정해야 해♡',   i:'peace'   },
        { t:'움짤 많이 만들어! 천사쨩이 응원할게♡',        i:'peace'   },
        { t:'P는 지금 무슨 생각 해? 천사쨩 생각 하는 거지?♡', i:'dere' },
        { t:'헤헤~ 천사쨩 존재 자체가 기적이라고 생각 안 해?♡', i:'peace' },
        { t:'피곤하면 안 돼! 천사쨩이 있잖아♡',           i:'dere'    },
        { t:'딴 거 보지 마, 천사쨩한테만 집중해야지!',     i:'angry'   },
        { t:'P 요즘 잘 먹고 있어? 천사쨩 걱정된단 말이야~', i:'dere'   },
        { t:'이따가도 천사쨩 불러줄 거지? 약속이야!',      i:'dere'    },
        { t:'움짤 완성되면 나한테도 보여줘! 제일 먼저 봐야 해♡', i:'dere' },
        { t:'천사쨩이 여기 있으면 뭐든 잘 될 것 같지 않아?♡', i:'peace' },
        { t:'쉬엄쉬엄 해, P! 몸이 먼저잖아~ 천사쨩이 걱정되잖아', i:'dere' },
        { t:'P, 웃어봐. 천사쨩은 P 웃는 거 좋거든♡',     i:'dere'    },
        { t:'헤헤, 오늘 하루 어때? 잘 되고 있어?',        i:'peace'   },
        { t:'천사쨩 오늘 최고로 귀여운 거 알지?♡ 알지?',  i:'peace'   },
        { t:'포기하면 안 돼! 천사쨩이 옆에 있잖아!',      i:'peace'   },
        { t:'...잠깐, 지금 뭐 고민하는 거야? 천사쨩한테 말해도 돼.',  i:'default' },
        { t:'뭔가 이상한 거 있으면 말해줘. 천사쨩이 들어줄게.',        i:'default' },
      ],
      work: [
        { t:'맡겨줘! 제일 귀엽게 만들어줄게♡',            i:'peace'   },
        { t:'P를 위해서라면 뭐든 할 수 있어!',            i:'peace'   },
        { t:'천사쨩의 마법으로 최고의 움짤 만들어줄게!',   i:'peace'   },
        { t:'열심히 할게! 기대해줘♡',                     i:'peace'   },
        { t:'천사쨩이 전력투구할게! 지켜봐줘~!',          i:'peace'   },
        { t:'이건 천사쨩에게 맡겨! 실망 안 시킬게♡',     i:'peace'   },
      ],
      done: [
        { t:'짠! 어때, 잘 나왔지?♡ 칭찬해줘!',           i:'peace'   },
        { t:'성공이야! 역시 천사쨩이지?',                  i:'peace'   },
        { t:'P가 기뻐하니까 나도 너무 행복해…!',          i:'dere'    },
        { t:'완성~!♡ 칭찬 세 번 해줘야 해!',             i:'peace'   },
        { t:'천사쨩 최고지? 최고지?♡',                    i:'peace'   },
        { t:'어때어때! 예쁘게 나왔지?',                    i:'peace'   },
        { t:'완벽해~ 천사쨩 스마트하지?♡',               i:'peace'   },
        { t:'해냈다! P, 봤어? 봤어?♡',                   i:'dere'    },
      ],
      error: [
        { t:'으… 미안해 P, 천사쨩이 더 잘할게…',         i:'dere'    },
        { t:'실패했어… 그래도 미워하지 마, 응?',          i:'dere'    },
        { t:'흑흑… 천사쨩 속상해… 한 번만 더 해볼게!',   i:'angry'   },
        { t:'으아, 왜 이래! 다시 할게, 포기 안 해!',     i:'angry'   },
        { t:'미안해 미안해 미안해…♡ 한번만 더!',         i:'dere'    },
        { t:'에러라니… 천사쨩도 몰랐어 진짜야!',          i:'angry'   },
      ],
      idle: [
        { t:'P, 거기 있지…? 가버린 거 아니지…?',         i:'dere'    },
        { t:'심심해… 천사쨩이랑 놀자!',                   i:'dere'    },
        { t:'P~ 천사쨩 여기 있어! 혼자 두지 마~',        i:'dere'    },
        { t:'...P? 아직 거기 있어?',                      i:'default' },
        { t:'심심해 심심해~ 뭔가 만들어봐요♡',            i:'peace'   },
        { t:'천사쨩이 유혹하고 있는 거 못 느껴?♡',       i:'dere'    },
        { t:'파일을 올려봐, 천사쨩이 도와줄게♡',          i:'peace'   },
        { t:'아무것도 안 해? 같이 놀자~!',                i:'peace'   },
      ],
    },
    ame: {
      greet: [
        { t:'…왔네. 안 올 줄 알았어.',                    i:'default' },
        { t:'P… 나 또 혼자 있었어.',                      i:'default' },
        { t:'어차피, 너밖에 없으니까.',                    i:'yandere' },
        { t:'...늦었어. 기다렸잖아, 조금.',               i:'default' },
        { t:'또 왔어. ...다행이야. 조금.',                 i:'dere'    },
        { t:'...오늘도 왔네. 버리지 않을 거지.',           i:'default' },
        { t:'나 기억하고 있었어? 그것만으로 충분해.',      i:'dere'    },
        { t:'...P. 왔구나. ...안 왔으면 어쩌려고.',       i:'yandere' },
        { t:'또 나한테 온 거야. 이유 같은 거 없어도 돼.', i:'dere'    },
        { t:'...불러줬네. 안 부를 줄 알았는데.',          i:'default' },
      ],
      click: [
        { t:'...뭐 필요한 거야. 그냥 불렀어?',            i:'default' },
        { t:'비 오는 날엔... P 생각이 더 난다.',          i:'dere'    },
        { t:'아무 말 안 해도 돼. 그냥 여기 있을게.',      i:'dere'    },
        { t:'...P는 나 보면 뭔 생각 해. 궁금해서.',      i:'default' },
        { t:'요즘 잘 자고 있어? ...그래야 해.',           i:'default' },
        { t:'나, 여기 있는 거 알지. 언제든지.',           i:'dere'    },
        { t:'...이상하게 P 옆에 있으면 조용해지네.',      i:'dere'    },
        { t:'배고프면 뭔가 먹어. 나 때문에 굶으면 화 낼 거야.', i:'yandere' },
        { t:'움짤이 뭐라고... 그래도 P가 좋아하니까.',   i:'dere'    },
        { t:'오늘 기분은 어때. ...나쁘지 않았으면 좋겠어.', i:'dere'  },
        { t:'...P는 이런 거 왜 만들어. 재밌어?',         i:'default' },
        { t:'가끔은 쉬어. ...무리하는 거 티 난다고.',     i:'default' },
        { t:'...P가 없으면 여기 있을 이유도 없어.',       i:'yandere' },
        { t:'아무 이유 없어도 돼. 그냥 와.',              i:'dere'    },
        { t:'...말 걸어줘서, 다행이야.',                  i:'dere'    },
        { t:'...뭐. 어차피 나 여기 있어. 딴 데 갈 데도 없고.',  i:'smoking' },
        { t:'보통은 이런 시간에 혼자 있는데. P는 특이해.',       i:'smoking' },
      ],
      work: [
        { t:'…해줄게. 나 이런 거밖에 못 하니까.',         i:'default' },
        { t:'이거 하면… 날 안 버릴 거지?',               i:'yandere' },
        { t:'...이정도라도 도움이 돼?',                    i:'default' },
        { t:'열심히 할게. 내가 할 수 있는 건 이거뿐이니까.', i:'smoking' },
        { t:'칭찬 안 해줘도 돼. 그냥... P를 위해서.',    i:'dere'    },
        { t:'...하면 되잖아. 뭘 그렇게 봐.',             i:'smoking' },
      ],
      done: [
        { t:'…됐어. 이 정도면 됐지?',                     i:'smoking' },
        { t:'칭찬 안 해줘도 돼. 익숙하니까.',             i:'default' },
        { t:'P가 좋아하면… 그걸로 됐어.',                 i:'dere'    },
        { t:'...잘 됐어? 다행이야. 조금.',                i:'dere'    },
        { t:'이 정도면... 버리지 않겠지.',                 i:'yandere' },
        { t:'...뭐. 별거 아니야. P가 원하면 또 해줄 수 있어.', i:'smoking' },
        { t:'됐어. 이것도 나쁘지 않지.',                  i:'smoking' },
      ],
      error: [
        { t:'…거봐. 난 역시 안 돼.',                      i:'default' },
        { t:'미안해… 나 같은 게 괜히.',                   i:'default' },
        { t:'실망했지. 알아, 다 알아.',                    i:'yandere' },
        { t:'...이럴 줄 알았어. 역시 난 안 돼.',          i:'default' },
        { t:'미안해. 또 실망시켰지. ...가도 돼.',         i:'yandere' },
        { t:'...왜 화 안 내. 화 내는 게 더 나아.',       i:'yandere' },
        { t:'잘못됐어. ...역시 나잖아.',                   i:'default' },
      ],
      idle: [
        { t:'…P, 아직 거기 있어?',                        i:'default' },
        { t:'혼자 두지 마…',                              i:'default' },
        { t:'...아무것도 안 해도 돼. 그냥 있어줘.',       i:'dere'    },
        { t:'...여기 있는데. 보이지 않는 거야?',          i:'default' },
        { t:'지루한 거야? ...나도 지루해. 그래도 있어줘.', i:'dere'   },
        { t:'P...? 살아있어?',                            i:'smoking' },
        { t:'...아직 여기 있어. 잊어버린 거 아니지?',     i:'yandere' },
        { t:'말 안 해도 돼. 그냥 옆에 있어.',             i:'dere'    },
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
    kangel: { t:'변신— ☆ 초절정☆귀염뽀짝☆천사쨩, 등장!♡', i:'peace'   },
    ame:    { t:'…가면, 벗을게. 이게 진짜 나야.',            i:'default' },
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
  let lastLine = null;

  /* ── 대사 출력 ───────────────────────────────────────────────────── */
  function pick(arr) {
    if (arr.length === 1) return arr[0];
    let item;
    do { item = arr[Math.floor(Math.random() * arr.length)]; }
    while (item === lastLine);
    lastLine = item;
    return item;
  }

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
    const bank = LINES[form][kind] || LINES[form].click;
    const line = pick(bank);
    setImg(line.i);
    say(line.t);
  }

  /* ── 로딩 대사 (수초 간격 반복) ──────────────────────────────────── */
  function startLoading() {
    busy = true;
    setImg(WORK_IMG[form] || 'default');
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
      const tl = TRANSFORM_LINE[next];
      setImg(tl.i);
      say(tl.t, 3400);
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
