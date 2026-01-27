let allNames = [];
let winnerData = [];
let drawnWinners = new Set();
let isConfirming = false;
let allNamesById = [];

const STORAGE_KEY = 'lucky-draw-formal_2026';
const scrollArea = document.querySelector('#scroll-area');
const dropdownButton = document.querySelector('#prize-btn');
const prizeText = dropdownButton;
const lever = document.querySelector('.lever');
const dropdownItems = document.querySelectorAll('.dropdown-item');
const specialPrizeContainer = document.querySelector('#special-prize-container');
const specialPrizeInput = document.querySelector('#special-prize-input');
const specialPrizeInput2 = document.querySelector('#special-prize-input2');
const specialPrizeDropdown2  = document.querySelector('#special-prize-dropdown2');
const specialPrizeAmountInput = document.querySelector('#special-prize-amount-input');
const specialBalanceBtn = document.querySelector('#special-balance-btn');
const specialBalanceInput = document.querySelector('#special-balance-input');
const clearAllBtn = document.querySelector('#clear-all-btn');
const cashBuns = document.querySelector('#cash-bonus-label');
const stickChang = document.querySelector('.stick');

//music
const drawSound = document.querySelector('#draw-sound');
const drawSound1 = document.querySelector('#draw-sound-1');
const winSound = document.querySelector('#win-sound');
const don = document.querySelector('#win-don');
const cheer = document.querySelector('#cheer');
const bi = document.querySelector('#bi');


function playDrawSound() {
  drawSound.currentTime = 0;
  drawSound.play();
};

function stopDrawSound() {
  drawSound.pause();
  drawSound.currentTime = 0;
};

function playDrawSound1() {
  drawSound1.currentTime = 0;
  drawSound1.play();
};

function stopDrawSound1() {
  drawSound1.pause();
  drawSound1.currentTime = 0;
};

function playBi() {
  bi.currentTime = 0;
  bi.play();
};

function stopBi() {
  bi.pause();
  bi.currentTime = 0;
};

function playDon() {
  const a = new Audio(don.src);
  a.play();
};

function playCheer() {
  cheer.currentTime = 0;
  cheer.play();
};

function playWinSound() {
  winSound.currentTime = 0;
  winSound.play();
};

const winnerLists = [
  document.querySelector('#winner-list'),
  document.querySelector('#winner-list-mobile')
];

let validateTimer = null;

specialPrizeAmountInput.addEventListener('input', () => {
  clearTimeout(validateTimer);

  validateTimer = setTimeout(() => {
    const value = Number(specialPrizeAmountInput.value);
      if (value && value < 2000) {
        specialPrizeAmountInput.focus();
        specialPrizeAmountInput.classList.add('is-invalid');
      } else {
        specialPrizeAmountInput.classList.remove('is-invalid');
      };
  }, 500); // 停止輸入 0.5 秒後才驗證
});



specialPrizeInput.addEventListener('focus', () => {
  buildWinnerDropdown(specialPrizeInput);
});

specialPrizeInput.addEventListener('input', e => {
  filterWinnerDropdown(e.target.value);
});

specialBalanceBtn.addEventListener('click', () => {
  if (dropdownButton.dataset.value === "11") {
    specialBalanceInput.style.display = 'block';
    specialBalanceBtn.style.display = "none";
    cashBuns.style.display = "none"; // 不顯示
    return;
  };

  // 其他獎項：顯示輸入框，隱藏按鈕，顯示現金加碼標籤
  specialBalanceInput.style.display = 'block';
  specialBalanceBtn.style.display = "none";
  cashBuns.style.display = "block";
});



document.addEventListener('click', e => {
  if (!e.target.closest('#winner-dropdown') &&
      e.target !== specialPrizeInput) {
    document.getElementById('winner-dropdown').style.display = "none";
  };
});


// 1~8獎的固定金額
const prizeAmounts = {
  1: 30000,
  2: 20000,
  3: 15000,
  4: 10000,
  5: 8000,
  6: 7000,
  7: 6000,
  8: 5000
};



const ITEM_HEIGHT = 90;

//設定拉霸三軸
const reels = [
  { el: document.createElement('div'), items: [], position: 0, finalItemIndex: null },
  { el: document.createElement('div'), items: [], position: 0, finalItemIndex: null },
  { el: document.createElement('div'), items: [], position: 0, finalItemIndex: null }
];


reels.forEach(r => {
  r.el.className = 'reel';
  scrollArea.appendChild(r.el);
});


// 匯入Excel
document.querySelectorAll('#file-input').forEach(input => {
  input.addEventListener('change', e => {
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {
        type: 'array'
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      allNames = json.slice(1).map(row => {
        const dept = row[0] != null ? String(row[0]).trim() : '';
        const id = row[1] != null ? String(row[1]).trim() : '';
        const name = row[2] != null ? String(row[2]).trim() : '';

        if (!dept || !name) return null;  // 只檢查部門和姓名
        return { dept, id, name };
      }).filter(Boolean);

      allNamesById = [...allNames].sort((a, b) => {
        return Number(a.id) - Number(b.id);
      });


      populateReels();
      startAutoScroll();
      updateCounts();
      populateSpecialPrizeList();
    };
    reader.readAsArrayBuffer(e.target.files[0]);
  });
});

// 匯出Excel
document.querySelector('#export-btn').addEventListener('click', () => {
  if (winnerData.length === 0) {
    const listToast = document.querySelector('#list-toast-body');
      listToast.innerHTML = `<p class="m-0">還沒有中獎名單可匯出！</p>`;
      const toastElement = document.querySelector('#list-toast');
      const toast = new bootstrap.Toast(toastElement);
      toast.show();
    return;
  };

  //轉成Excel
  const wsData = winnerData.map(w => [
    `${w.dept} - ${w.name}`,
    w.prize,
    w.bonusSource,  //中獎來源
    w.prizeAmounts, //公司提供金額
    w.specialBonus, //加碼金額
    w.bonus2Source, //加碼來源
    w.balance ?? 0
  ]);

  //加標題列
  const ws = XLSX.utils.aoa_to_sheet([['中獎人','獎項', '中獎來源','公司提供金額', '加碼金額','加碼來源','轉出金額']].concat(wsData));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '中獎名單');

  //下載 Excel
  XLSX.writeFile(wb, '大寶2026年尾牙中獎名單.xlsx');
});

//獎項圈數設定
function getFullRounds(prizeValue) {
  const roundsMap = {
    1: 15,
    2: 12,
    3: 10,
    4: 9,
    5: 7,
    6: 5,
    7: 4,
    8: 3,
    9: 3,
    10: 3
  };
  return roundsMap[prizeValue] || 3;
};


function populateReels() {
  reels.forEach(r => {
    r.el.innerHTML = '';
    r.items = [];
    r.mapIndex = [];
  });

  const minReelLength = 15;
  const allLength = allNames.length;

  // 若名單比最小長度短，計算需要補多少
  const padCount = Math.max(0, Math.floor((minReelLength - allLength) / 2));

  // ===== 主名單 =====
  allNames.forEach((p, i) => {
    reels.forEach((r, reelIndex) => {
      const div = document.createElement('div');
      div.className = 'symbol';
      div.textContent =
        reelIndex === 0 ? p.dept :
        reelIndex === 1 ? p.id :
        p.name;

      r.el.appendChild(div);
      r.items.push(div);
      r.mapIndex.push(i);
    });
  });


  if (padCount > 0) {
    reels.forEach((r, reelIndex) => {
      for (let i = 0; i < padCount; i++) {
        // 前補（從尾巴往前取）
        const beforeIndex = (allLength - padCount + i) % allLength;
        const beforePerson = allNames[beforeIndex];
        const divBefore = document.createElement('div');
        divBefore.className = 'symbol';
        divBefore.textContent =
          reelIndex === 0 ? beforePerson.dept :
          reelIndex === 1 ? beforePerson.id :
          beforePerson.name;

        r.el.insertBefore(divBefore, r.el.firstChild);
        r.items.unshift(divBefore);
        r.mapIndex.unshift(beforeIndex);

        // 後補
        const afterIndex = i % allLength;
        const afterPerson = allNames[afterIndex];
        const divAfter = document.createElement('div');
        divAfter.className = 'symbol';
        divAfter.textContent =
          reelIndex === 0 ? afterPerson.dept :
          reelIndex === 1 ? afterPerson.id :
          afterPerson.name;

        r.el.appendChild(divAfter);
        r.items.push(divAfter);
        r.mapIndex.push(afterIndex);
      };
    });
  };
};



function ensureReelLoop(reel, reelIndex) {
  const viewportHeight = document.querySelector('.scroll-viewport').offsetHeight;
  const threshold = ITEM_HEIGHT * 3; // 提前3筆追加
  if (reel.position + viewportHeight > reel.items.length * ITEM_HEIGHT - threshold) {
    appendReelItems(reel.items.length);
  };
};

function appendReelItems(startIndex) {
  reels.forEach(r => {
    const total = allNames.length;
    // 每軸追加 ITEM_HEIGHT 高度的元素
    for (let i = startIndex; i < startIndex + 3; i++) {
      const idx = i % total;
      const p = allNames[idx];
      const div = document.createElement('div');
      div.className = 'symbol';
      // 依軸選顯示
      div.textContent = r.el === reels[0].el ? p.dept
                        : r.el === reels[1].el ? p.id
                        : p.name;
      r.el.appendChild(div);
      r.items.push(div);
      r.mapIndex.push(idx);
    };
  });
};



// 自動滾動
let autoScrollId = null;
function startAutoScroll() {
  if (autoScrollId !== null) return;
  lever.classList.remove('no-glow');
  let lastTime = performance.now();

  function step(now) {
    const delta = now - lastTime;
    lastTime = now;

    reels.forEach((reel, idx) => {
      const speed = ITEM_HEIGHT * 1;
      reel.position += speed * (delta / 1000);

      ensureReelLoop(reel, idx); // 傳入 reelIndex

      const totalHeight = ITEM_HEIGHT * reel.items.length;
      reel.el.style.transform = `translateY(-${reel.position % totalHeight}px)`;
    });

    autoScrollId = requestAnimationFrame(step);
  };

  autoScrollId = requestAnimationFrame(step);
};

//停止名單滾動
function stopAutoScroll() {
  cancelAnimationFrame(autoScrollId);
  autoScrollId = null;
};

// 下拉選單
dropdownItems.forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const value = item.dataset.value;
    prizeText.textContent = item.textContent;
    dropdownButton.dataset.value = value;
    specialPrizeInput.value = '';
    specialPrizeInput.dataset.id = '';
    specialPrizeInput2.value = '';
    specialBalanceInput.value = '';
    specialPrizeAmountInput.value = '';
    if (value === "9") {
      specialBalanceInput.style.display = "none";
      specialPrizeContainer.style.display = "block";
      specialPrizeInput.style.display = "inline-block";
      specialPrizeInput2.style.display = "none";
      specialPrizeAmountInput.style.display = "block";
      setStickOffset(100);
      specialPrizeContainer.classList.replace("mt-4", "mt-2");
      specialBalanceBtn.style.display = "block";
    } else if (value === "10"){
      specialBalanceInput.style.display = "none";
      specialPrizeContainer.style.display = "block";
      specialPrizeInput2.style.display = "inline-block";
      specialPrizeInput.style.display = "none";
      specialBalanceBtn.style.display = "none";
      specialPrizeAmountInput.style.display = "block";
      cashBuns.style.display = 'none';
      setStickOffset(40);
      specialPrizeContainer.classList.replace("mt-4", "mt-2");
    } else if (value === "11") {  // 追加獎
      specialBalanceInput.style.display = "none";
      specialPrizeContainer.style.display = "block";
      specialPrizeInput.style.display = "none";
      specialPrizeInput2.style.display = "none";
      specialPrizeAmountInput.style.display = "block";
      specialBalanceBtn.style.display = "none";
      cashBuns.style.display = 'none';
      setStickOffset(0);
      specialPrizeContainer.classList.replace('mt-2', 'mt-4');
    } else {
      specialPrizeContainer.style.display = "none";
      specialBalanceBtn.style.display = "none";
      cashBuns.style.display = 'none';
      setStickOffset(0);
      specialPrizeContainer.classList.replace("mt-4", "mt-2");
    };

  });
});

//防呆用
function hasSelectedPrize() {
  return !!dropdownButton.dataset.value;
};

// 拉霸按鈕事件
document.querySelectorAll('.lever .prize-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasSelectedPrize()) {
      const listToast = document.querySelector('#list-toast-body');
      listToast.innerHTML = `<p class="m-0">請先選擇獎項！</p>`;
      const toastElement = document.querySelector('#list-toast');
      const toast = new bootstrap.Toast(toastElement);
      toast.show();
      return;
    };
    if (isConfirming) return;
    if (allNames.length === 0) {
      const listToast = document.querySelector('#list-toast-body');
      listToast.innerHTML = `<p class="m-0">請先匯入抽獎名單！</p>`;
      const toastElement = document.querySelector('#list-toast');
      const toast = new bootstrap.Toast(toastElement);
      toast.show();

      return;
    };

    const selectedPrize = dropdownButton.dataset.value;

    // 9獎防呆：分享人 & 分享金額
    if (selectedPrize === "9") {
    const shareId = specialPrizeInput.dataset.id;
    const shareName = specialPrizeInput.value?.trim();
    const shareAmount = Number(specialPrizeAmountInput.value || 0);

      if (!shareName || !shareId || shareAmount <= 0) {
        const listToast = document.querySelector('#list-toast-body');
        listToast.innerHTML = `<p class="m-0">請先選擇「分享人」以及輸入「分享金額」才能抽獎！</p>`;
        const toastElement = document.querySelector('#list-toast');
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        return;
      };

      const remaining = getRemainingShareAmount(shareId);
        if (shareAmount > remaining) {
          const exceed = shareAmount - remaining;
          showShareExceedToast(
            remaining,
            shareAmount,
            exceed,
            () => {
              specialBalanceBtn.style.display = 'none';
              specialBalanceInput.style.display = 'block';
              cashBuns.style.display = 'block';
              specialBalanceInput.value =
                Number(specialBalanceInput.value || 0) + exceed;
              specialPrizeAmountInput.value = remaining;
            },
            () => {
              specialPrizeAmountInput.value = remaining;
            },
          );
          return; // 這行很重要：阻止抽獎
        };

    } else if (selectedPrize === "10") {
      const bonusName = specialPrizeInput2.value?.trim();
      const bonusAmount = Number(specialPrizeAmountInput.value || 0);

      if (!bonusName || bonusAmount <= 0) {
        const listToast = document.querySelector('#list-toast-body');
        listToast.innerHTML = `<p class="m-0">請先選擇「加碼人」以及輸入「加碼金額」才能抽獎！</p>`;
        const toastElement = document.querySelector('#list-toast');
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        return;
      };
    } else if (selectedPrize === "11") {
      const amount = Number(specialPrizeAmountInput.value || 0);
      if (amount <= 0) {
        const listToast = document.querySelector('#list-toast-body');
        listToast.innerHTML = `<p class="m-0">請先輸入金額才能抽獎！</p>`;
        const toastElement = document.querySelector('#list-toast');
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        return;
      };
    };


    lever.classList.add("pull");
    lever.classList.add("no-glow");

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      reels.forEach(r =>
        r.items.forEach(item =>
          item.classList.remove('winner-highlight')
        )
      );


      if (!isConfirming && autoScrollId !== null) {
        await doDraw();
      };

    } finally {
      lever.classList.remove("pull");
    };

  });
});


// 抽獎

async function doDraw() {

  //音效
  stopDrawSound();
  stopDrawSound1();
  winSound.pause();
  winSound.currentTime = 0;

  // **抽出還未中獎列表，用途，避免重覆中獎
  const available = allNames.filter(p => !drawnWinners.has(p.id));
  if (!available.length) {
    alert("所有人都已中獎！");
    return;
  };

  stopAutoScroll();
  isConfirming = true;
  const main = document.querySelector('.main');
  main.classList.add('active');

  // **決定中獎者的地方,已平均隨機方式抽取一名
  const winner = available[Math.floor(Math.random() * available.length)];

  // **紀錄中獎者避免重複抽到
  drawnWinners.add(winner.id);

  // 原始名單索引
  const winnerIndex = allNames.findIndex(p => p.id === winner.id);

  // 每軸對應 reel.items 的索引
  const reelTargetIndexes = reels.map(r => winnerIndex);
  const prizeValue = parseInt(dropdownButton.dataset.value) || 1;
  const fullRounds = getFullRounds(prizeValue);

  const noDelayPrizes = [7, 8];

  let reelDurations;

  if (noDelayPrizes.includes(prizeValue)) {
    reelDurations = [
      800 + fullRounds * 200,
      800 + fullRounds * 200 + 300,
      800 + fullRounds * 200 + 800
    ];
  } else {
    reelDurations = [
      800 + fullRounds * 200,
      800 + fullRounds * 200 + 3000,
      800 + fullRounds * 200 + 6000
    ];
  };

  const viewportHeight = document.querySelector('.scroll-viewport').offsetHeight;
  const centerOffset = (viewportHeight / 2) - (ITEM_HEIGHT / 2);

  if (dropdownButton.dataset.value === "1") {
    playDrawSound();
    const totalTime = 10000; // 10秒總時長
    const midAnimationTime = 1500; // 中間動畫
    const firstHalfTime = 3000; // 第一段滾輪
    const secondHalfTime = totalTime - midAnimationTime - firstHalfTime; // 第二段滾輪剩下 5.5 秒

    // 獎項1：分兩段滾輪 + 中間暫停動畫
    const halfRounds = Math.floor(fullRounds / 2);

    // 第一段滾輪：滾到距離中獎者還 3 格的位置（修正避免空白或消失）
    const preTargetIndexes = reels.map((r, i) => {
      const target = reelTargetIndexes[i];
      const fullLength = r.mapIndex.length;
      return (target - 3 + fullLength) % fullLength;
    });

    await Promise.all([
      spinReel(reels[0], preTargetIndexes[0], firstHalfTime, 0, halfRounds),
      spinReel(reels[1], preTargetIndexes[1], firstHalfTime, 0, halfRounds),
      spinReel(reels[2], preTargetIndexes[2], firstHalfTime, 0, halfRounds)
    ]);
    stopDrawSound();
    setTimeout(() => {
    stopBi();
    playDrawSound1();
    }, 1500);

    // 暫停 + 動畫（你的淡出/彈入/空白邏輯）
    await freezeMidAnimation(midAnimationTime);

    // 第二段滾輪：分別啟動，每軸帶入小 delay 以產生依序停的感覺
    const p0 = spinReel(reels[0], reelTargetIndexes[0], reelDurations[0] , 0, fullRounds - halfRounds)
      .then(() => {
        highlightReel(0)
        playDon();
      });
    const p1 = spinReel(reels[1], reelTargetIndexes[1], reelDurations[1] , 150, fullRounds - halfRounds)
      .then(() => {
        highlightReel(1)
        playDon();
      });
    const p2 = spinReel(reels[2], reelTargetIndexes[2], reelDurations[2] , 300, fullRounds - halfRounds)
      .then(() => {
        highlightReel(2);
        playDon();
      });

    await Promise.all([p0, p1, p2]);

    handleWinnerText(winner);
    populateSpecialPrizeList();

    stopDrawSound1();
    playWinSound();
    playCheer();

    setTimeout(() => {

      main.classList.remove('active');
      lever.classList.remove('no-glow');
      startAutoScroll();
      isConfirming = false;
    }, 4000);
  } else if(dropdownButton.dataset.value === "7" || dropdownButton.dataset.value === "8"){
    playDrawSound();
    // 其他獎項保持原流程
    const p0 = spinReel(reels[0], reelTargetIndexes[0], reelDurations[0], 0, fullRounds)
      .then(() => {
        highlightReel(0)
        playDon();
      });
    const p1 = spinReel(reels[1], reelTargetIndexes[1], reelDurations[1], 0, fullRounds)
      .then(() => {
        highlightReel(1)
        playDon();
      });
    const p2 = spinReel(reels[2], reelTargetIndexes[2], reelDurations[2], 0, fullRounds)
      .then(() => {
        highlightReel(2)
      })
      .then(() => {
        // 最終停齊位置正中
        handleWinnerText(winner);
          stopDrawSound();
          playWinSound();

        setTimeout(() => {
          main.classList.remove('active');
          lever.classList.remove('no-glow');
          reels.forEach(reel => {
            const totalHeight = reel.items.length * ITEM_HEIGHT;
            reel.position = ((reel.position % totalHeight) + totalHeight) % totalHeight;
          });
          startAutoScroll();
          isConfirming = false;
        }, 4000);
      });
  } else {
    playDrawSound();
    // 其他獎項保持原流程
    const p0 = spinReel(reels[0], reelTargetIndexes[0], reelDurations[0], 0, fullRounds)
      .then(() => {
        highlightReel(0)
        playDon();
      });
    const p1 = spinReel(reels[1], reelTargetIndexes[1], reelDurations[1], 0, fullRounds)
      .then(() => {
        highlightReel(1)
        playDon();
      });
    const p2 = spinReel(reels[2], reelTargetIndexes[2], reelDurations[2], 0, fullRounds)
      .then(() => {
        highlightReel(2)
        playDon();
      })
      .then(() => {
        // 最終停齊位置正中
        handleWinnerText(winner);
          stopDrawSound();
          playWinSound();

        setTimeout(() => {
          main.classList.remove('active');
          lever.classList.remove('no-glow');
          reels.forEach(reel => {
            const totalHeight = reel.items.length * ITEM_HEIGHT;
            reel.position = ((reel.position % totalHeight) + totalHeight) % totalHeight;
          });
          startAutoScroll();
          isConfirming = false;
        }, 4000);
      });
  };
};


function spinReel(reel, targetIndex, duration = 3000, delay = 0, fullRounds = 3) {
  return new Promise(resolve => {
    setTimeout(() => {
      const startTime = performance.now();
      const startPos = reel.position;
      const totalHeight = ITEM_HEIGHT * reel.items.length;
      const viewportHeight = document.querySelector('.scroll-viewport').offsetHeight;
      const centerOffset = (viewportHeight / 2) - (ITEM_HEIGHT / 2);

      // 找最接近中間輪次的 target，而不是最後一個
      const totalItems = reel.mapIndex.length;
      let reelTargetItemIndex = null;
      for (let i = 0; i < totalItems; i++) {
        if (reel.mapIndex[i] === targetIndex) {
          // 找第一個可見的，避免 append 多輪後停錯
          if (i * ITEM_HEIGHT >= startPos) {
            reelTargetItemIndex = i;
            break;
          };
        };
      };
      // 如果沒找到，直接用最後一個
      if (reelTargetItemIndex === null) {
        for (let i = totalItems - 1; i >= 0; i--) {
          if (reel.mapIndex[i] === targetIndex) {
            reelTargetItemIndex = i;
            break;
          };
        };
      };

      const targetPos = reelTargetItemIndex * ITEM_HEIGHT;

      function easeOutQuad(t) {
        return t * (2 - t);
      };

      function animate(now) {
        let t = (now - startTime) / duration;
        if (t > 1) t = 1;

        const eased = easeOutQuad(t);
        const distance = (targetPos - startPos + totalHeight * fullRounds);
        const currentPos = startPos + distance * eased;

        const displayPos = ((currentPos % totalHeight) + totalHeight) % totalHeight;

        reel.position = displayPos;
        reel.el.style.transform = `translateY(-${displayPos}px)`;

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          //  最終強制對齊中心
          const finalTransform = targetPos - centerOffset;
          reel.el.style.transform = `translateY(-${finalTransform}px)`;
          reel.position = finalTransform; // 同步更新 reel.position
          reel.finalItemIndex = reelTargetItemIndex;
          resolve();
        };
      };

      requestAnimationFrame(animate);
    }, delay);
  });
};




function highlightReel(i) {
  const reel = reels[i];
  reel.items.forEach(item =>
    item.classList.remove('winner-highlight'));
    if (reel.finalItemIndex !== null) {
      reel.items[reel.finalItemIndex] ?.classList.add('winner-highlight');
    };
};


// 紙花特效
function showWinnerEffect() {
  if (typeof confetti !== 'undefined') {
    const count = 800;
    const defaults = { origin: { x: 0.5, y: 0.6 } };
    function fire(ratio, opts) { confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) }); }
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
    confetti({ origin: { x: 0.1, y: 0.9 }, angle: 60, spread: 100, startVelocity: 45, particleCount: 200, scalar: 1.1, decay: 0.9 });
    confetti({ origin: { x: 0.9, y: 0.9 }, angle: 120, spread: 100, startVelocity: 45, particleCount: 200, scalar: 1.1, decay: 0.9 });
  };

  for (let angle = 0; angle < 360; angle += 20) {
    confetti({
      particleCount: 10,
      angle: angle,
      spread: 10,
      startVelocity: 40,
      gravity: 0.15,
      colors: ['#FFD700', '#FF4D4D'],
      origin: { x: 0.5, y: 0.5 }
    });
  };


  const prizeValue = Number(dropdownButton.dataset.value);

  if (prizeValue === 1) {
    [0.2, 0.4, 0.6, 0.8].forEach((x, i) => {
      setTimeout(() => showFireworks(x), i * 220);
    });
  } else if (prizeValue === 10) {
    specialShow();
  } else {
    return;
  };
};

//煙火特效
function showFireworks(x = 0.5) {
  //上升
  confetti({
    particleCount: 36,
    angle: 90,
    spread: 6,
    startVelocity: 95,
    gravity: 0.32,
    decay: 0.97,
    ticks: 280,
    scalar: 0.55,
    colors: ['#FFD700'],
    origin: { x, y: 1 }
  });

  // 爆炸
  setTimeout(() => {
    confetti({
      particleCount: 220,
      spread: 360,
      startVelocity: 38,
      gravity: 0.28,
      decay: 0.97,
      ticks: 380,
      scalar: 0.95,
      colors: ['#FFD700', '#FF4D4D', '#FFFFFF'],
      origin: { x, y: 0.4 }
    });
  }, 620);
};

function specialShow() {
  //左
  confetti({
    particleCount: 150,
    angle: 120,
    spread: 140,
    startVelocity: 20,
    gravity: 0.22,
    ticks: 300,
    scalar: 1.2,
    colors: ['#FFD700'],
    origin: { x: 0.5, y: 0.3 }
  });

  // 右
  confetti({
    particleCount: 190,
    angle: 90,
    spread: 140,
    startVelocity: 60,
    gravity: 0.22,
    ticks: 380,
    scalar: 1.4,
    colors: ['#FFD700'],
    origin: { x: 0.5, y: 0.3 }
  });

};

function showShareExceedToast(remaining, shareAmount, exceed, onConfirm, onCancel) {
  const toastEl = document.getElementById('confirm-toast');
  const toastBody = document.getElementById('confirm-toast-body');
  const btnYes = document.getElementById('confirm-yes');
  const btnNo = document.getElementById('confirm-no');

  // 設定訊息
  toastBody.innerHTML = `
    <div class="text-center">
      <h2 class="fs-bold text-danger pb-2">分享金額已超過可分享上限！</h3>
      <p>可分享金額剩餘：<span>${remaining.toLocaleString()}<span></p>
      <p>目前輸入金額：<span>${shareAmount.toLocaleString()}</span></p>
      <p>超出金額：<span class="text-danger pb-2 fw-bold">${exceed.toLocaleString()}</span></p>
      <p class="text-center">是否要將<span class="text-danger pb-2 fw-bold">NT${exceed.toLocaleString()}</span>元改為現金加碼？</p>
    </div>
  `;

  // 綁定按鈕事件
  const cleanUp = () => {
    btnYes.onclick = null;
    btnNo.onclick = null;
    const bsToast = bootstrap.Toast.getInstance(toastEl);
    if (bsToast) bsToast.hide();
  };

  btnYes.onclick = () => { cleanUp(); onConfirm(); };
  btnNo.onclick = () => { cleanUp(); onCancel(); };

  // 顯示 Toast
  const bsToast = new bootstrap.Toast(toastEl, { autohide: false });
  bsToast.show();
};


//初始化監聽第九獎
function bindShareAmountInput() {
  specialPrizeAmountInput.addEventListener('input', () => {
    const prizeValue = dropdownButton.dataset.value; // 目前選的獎項
    if (prizeValue !== "9") return; // 只對第九獎做判斷

    const shareId = specialPrizeInput.dataset.id;
    const shareAmount = Number(specialPrizeAmountInput.value || 0);

    if (!shareId || shareAmount <= 0) return;

    const target = winnerData.find(w => w.id === shareId);
    if (!target) return;

    const originalAmount = target.prizeAmounts || 0;

    const usedShare = winnerData
      .filter(w => w.shareToId === shareId)
      .reduce((sum, w) => sum + (w.shareAmount || 0), 0);

    const remaining = originalAmount - usedShare;

    if (shareAmount > remaining) {
      const exceed = shareAmount - remaining;

      showShareExceedToast(
        remaining,
        shareAmount,
        exceed,
        () => {
          specialBalanceBtn.style.display = 'none';
          specialBalanceInput.style.display = 'block';
          cashBuns.style.display = 'block';
          specialBalanceInput.value =
            Number(specialBalanceInput.value || 0) + exceed;
          specialPrizeAmountInput.value = remaining;
        },
        () => {
          specialPrizeAmountInput.value = remaining;
        },
      );
    };
  });
};

// 初始化
bindShareAmountInput();


//整合中獎後續動作特效
function handleWinnerText(winner) {
  const prizeValue = dropdownButton.dataset.value;
  const prizeName = prizeText.textContent;
  let companyPrizeValue = prizeAmounts[prizeValue] || 0;

  let prizeAmountsText = `${winner.dept} - ${winner.name}`;
  let bonusText = "";
  let bonus2Text = "";
  let specialBonusText = "";
  let specialBonusValue = "";


  const bonus9Value  = Number(specialBalanceInput.value || 0);
  const bonus10Value = Number(specialPrizeAmountInput.value || 0);


  if (prizeValue === "9" || prizeValue === "11") {  // 11 與 9 一樣處理
    specialBonusValue = (Number(specialBalanceInput.value) || 0);
    bonusText = specialPrizeInput.value?.trim() || "";
    companyPrizeValue = Number(specialPrizeAmountInput.value) || 0;
  } else if (prizeValue === "10") {
    specialBonusValue = bonus10Value > 0 ? bonus10Value : 0;

    // 從輸入值取得工號
    const inputParts = specialPrizeInput2.value?.trim().split(" - ") || [];
    const selectedId = inputParts[0];

    // 找到對應的部門與姓名
    const selectedPerson = allNames.find(p => p.id === selectedId);

    bonus2Text = selectedPerson
      ? `${selectedPerson.dept} - ${selectedPerson.name}`
      : specialPrizeInput2.value; // 找不到就維持原本文字

    specialBonusText = specialPrizeAmountInput.value
      ? `${Number(specialPrizeAmountInput.value).toLocaleString()}`
      : "";
  };



  const companyPrizeAmount = companyPrizeValue
    ? `【金額：${companyPrizeValue.toLocaleString()}】`
    : "";
  let displayText = companyPrizeAmount
    ? `${prizeName}${companyPrizeAmount}：`
    : `${prizeName}`;

  const specialBonusDisplay = specialBonusValue
    ? ` + 現金加碼：${specialBonusValue.toLocaleString()}`
    : "";

  // li 顯示文字
  const displayLine = companyPrizeValue
    ? `【金額：${companyPrizeValue.toLocaleString()}${specialBonusDisplay}】`
    : "";


  const li = document.createElement('li');
  li.dataset.key = winner.id;

  // 判斷是否幸運分享獎
  if (prizeValue === "9") {
    li.innerHTML = `
      <p>${prizeName}${displayLine}：${prizeAmountsText}</p>
      <p style="color:#D67158;">【${bonusText}-幸運分享】</p>
    `;
  } else if (prizeValue === "11") {
        li.innerHTML = `
      <p>${prizeName}${displayLine}：${prizeAmountsText}</p>
    `;
  } else if (prizeValue === "10") {
    li.innerHTML = `
      <p>${displayText}【金額：${specialBonusText}】：${prizeAmountsText}</p>
      <p style="color:#D67158;">【${bonus2Text}】</p>
    `;
  } else {
    li.innerHTML = `
      <p>${displayText}${prizeAmountsText}</p>
    `;
  };

  const isSharePrize = prizeValue === "9"

  let shareToId = isSharePrize
  ? specialPrizeInput.dataset.id || null
  : null;

  if (isSharePrize && shareToId) {
    // 透過輸入值找到被分享的中獎人
    const target = winnerData.find(w => w.id === shareToId);
    if (target) {
      const addAmount = Number(specialPrizeAmountInput.value || 0);
    target.balance = (target.balance || 0) + addAmount;
    } else {
      shareToId = `extra-${Date.now()}`;
    };
  };



  // **加入 winnerData**
  winnerData.push({
    dept: winner.dept,
    id: winner.id,
    name: winner.name,
    prize: prizeText.textContent,
    bonusSource: bonusText,
    prizeAmounts: companyPrizeValue,
    specialBonus: specialBonusValue,
    bonus2Source: bonus2Text,
    shareToId,
    shareAmount: isSharePrize ? Number(specialPrizeAmountInput.value || 0) : 0,
    shareToIndex: isSharePrize ? winnerData.length - 1 : null,
    balance: 0
  });

  winnerLists.forEach(list => list.insertBefore(li.cloneNode(true), list.firstChild));
  showWinnerEffect();
  updateCounts();
  saveState();
};


// 清除中獎者
winnerLists.forEach(list => {
  list.addEventListener('click', e => {
    if (!e.target.classList.contains('remove-btn')) return;

    const li = e.target.closest('li');
    if (!li) return;

    const key = li.dataset.key;

    // ======== 啟動「刪除確認 Toast」 ========
    const confirmBody = document.querySelector('#confirm-toast-body');
    confirmBody.innerHTML  = `
    <div class="text-center"
      <p>確定要移除<span class="text-danger">工號：${key}</span>嗎？</p>
      <p>移除後會回到抽獎名單內。</p>
    </div>`
    ;

    const confirmToastEl = document.querySelector('#confirm-toast');
    const confirmToast = new bootstrap.Toast(confirmToastEl);
    confirmToast.show();

    const yesBtn = document.querySelector('#confirm-yes');
    const noBtn = document.querySelector('#confirm-no');

    const cleanup = () => {
      yesBtn.onclick = null;
      noBtn.onclick = null;
    };

    yesBtn.onclick = () => {
      cleanup();
      confirmToast.hide();

      const index = winnerData.findIndex(
        w => w.id === key
      );

      if (index === -1) return;

      const record = winnerData[index];

      // 如果刪的是「分享事件」，要回扣 balance
      if (record.shareToId) {
        const target = winnerData.find(w => w.id === record.shareToId);
        if (target) {
          target.balance = (target.balance || 0) - (record.shareAmount || 0);
        };
      };


    // 移除該筆資料（不能用 filter）
    winnerData.splice(index, 1);

    // 從已中獎名單移除
    drawnWinners.delete(record.id);
    //存檔
    saveState();

    // 刪畫面
    li.remove();

    updateCounts();

  // 成功 Toast
    const successBody = document.querySelector('#success-toast-body');
    successBody.innerHTML =
      `<p class="m-0" <span class="text-danger">工號：${key}</span>已從中獎名單移除，可以再次抽到</p>`;

    const successToastEl = document.querySelector('#success-toast');
    const successToast = new bootstrap.Toast(successToastEl);
    successToast.show();
    };

    // === 按下「取消」 ===
    noBtn.onclick = () => {
      cleanup();
      confirmToast.hide();
    };

  });
});

//同步抓取前後端資料
function updateCounts() {
  const total = allNames.length;
  const win = drawnWinners.size;
  const remain = total - win;

  document.querySelector('#total-count').textContent = total;
  document.querySelector('#win-count').textContent = win;
  document.querySelector('#remain-count').textContent = remain;
};


//淡出彈入動畫
async function playPrizeAnimation(midTime = 1000) { // 傳入中間動畫時間
  const panel = document.querySelector('.animate__animated');

  panel.classList.remove('animate__headShake', 'animate__flash', 'glitch-effect');

  function playAnimation(animName) {
    return new Promise(resolve => {
      panel.classList.remove(animName);
      void panel.offsetWidth;
      panel.classList.add(animName);
      panel.addEventListener('animationend', () => {
        panel.classList.remove(animName);
        resolve();
      }, { once: true });
    });
  };

  const displayText = panel.textContent;
  panel.setAttribute('data-text', displayText);

  // glitch-tv 效果縮短
  panel.classList.add("glitch-tv");
  await new Promise(resolve => setTimeout(resolve, midTime));
  panel.classList.remove("glitch-tv");

  // 縮短消失停留
  panel.style.visibility = 'hidden';
  await new Promise(resolve => setTimeout(resolve, 500));

  panel.style.visibility = '';
  await playAnimation('animate__flash');
};

// 凍結特效 + 淡出彈入動畫
async function freezeMidAnimation(midTime = 1000) {
  playBi();
  await playPrizeAnimation(midTime);
  reels.forEach(r => r.el.style.transition = "");
};


// let handAnim = lottie.loadAnimation({
//   container: document.getElementById('hand-animation-container'),
//   renderer: 'svg',
//   loop: true,
//   autoplay: false,   //不自動播放
//   path: './Artboard1.json'
// });


//中獎人選

function buildWinnerDropdown(inputEl) {
  const dropdown = document.getElementById('winner-dropdown');
  dropdown.innerHTML = "";

  if (!winnerData.length) {
    dropdown.style.display = "none";
    return;
  };

  winnerData.forEach(w => {
    const btn = document.createElement('button');
    btn.type = "button";
    btn.className = "list-group-item list-group-item-action";
    btn.textContent = `${w.dept} - ${w.name}`;

    btn.addEventListener('click', () => {
      inputEl.value = btn.textContent;
      inputEl.dataset.id = w.id;
      dropdown.style.display = "none";
    });

    dropdown.appendChild(btn);
  });

  dropdown.style.display = "block";
};

function filterWinnerDropdown(keyword) {
  const dropdown = document.getElementById('winner-dropdown');
  const items = dropdown.querySelectorAll('button');

  let hasVisible = false;

  items.forEach(item => {
    const match = item.textContent.includes(keyword);
    item.style.display = match ? "block" : "none";
    if (match) hasVisible = true;
  });

  dropdown.style.display = hasVisible ? "block" : "none";
};


//現金加碼

function populateSpecialPrizeList() {
  const datalist = document.getElementById('special-prize-list');
  datalist.innerHTML = "";


  // 可以選 allNames 或 winnerData
  allNamesById.forEach(p => {
    const option = document.createElement('option');
    option.value = `${p.id} - ${p.name}`;
    datalist.appendChild(option);
  });
};

//現金追加匯入
function populateSpecialPrizeList2() {
  specialPrizeInput2.addEventListener('input', () => {
    const keyword = specialPrizeInput2.value.trim().toLowerCase();
    specialPrizeDropdown2.innerHTML = '';

    if (!keyword) {
      specialPrizeDropdown2.style.display = 'none';
      return;
    };

    const filtered = allNames.filter(p => {
      const fullName = `${p.dept} - ${p.name}`.toLowerCase();
      return fullName.includes(keyword);
    });

    if (filtered.length === 0) {
      specialPrizeDropdown2.style.display = 'none';
      return;
    };

    filtered.forEach(p => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';
      div.textContent = `${p.dept} - ${p.name}`;
      div.dataset.id = p.id; // 用工號綁定
      div.style.cursor = 'pointer';

      div.addEventListener('click', () => {
        specialPrizeInput2.dataset.id = div.dataset.id; // 存工號
        specialPrizeInput2.value = div.textContent;
        specialPrizeDropdown2.style.display = 'none';
      });

      specialPrizeDropdown2.appendChild(div);
    });

    const rect = specialPrizeInput2.getBoundingClientRect();
    specialPrizeDropdown2.style.top = rect.bottom + window.scrollY + 'px';
    specialPrizeDropdown2.style.left = rect.left + window.scrollX + 'px';
    specialPrizeDropdown2.style.width = rect.width + 'px';
    specialPrizeDropdown2.style.display = 'block';
  });

  // 點空白收起 dropdown
  document.addEventListener('click', e => {
    if (!specialPrizeDropdown2.contains(e.target) && e.target !== specialPrizeInput2) {
      specialPrizeDropdown2.style.display = 'none';
    };
  });
};

// 初始化呼叫
populateSpecialPrizeList2();


//自動存檔

function saveState() {
  localStorage.setItem(
    `${STORAGE_KEY}_winnerData`,
    JSON.stringify(winnerData)
  );
  localStorage.setItem(
    `${STORAGE_KEY}_drawnWinners`,
    JSON.stringify([...drawnWinners])
  );
};

(function restoreState() {
  const savedWinners = localStorage.getItem(`${STORAGE_KEY}_winnerData`);
  const savedDrawn = localStorage.getItem(`${STORAGE_KEY}_drawnWinners`);


  if (!savedWinners || !savedDrawn) return;

  winnerData = JSON.parse(savedWinners);
  drawnWinners = new Set(JSON.parse(savedDrawn));

  try {
    // 清空現有畫面
    winnerLists.forEach(list => list.innerHTML = '');

    // 重新建立 li
    for (let i = winnerData.length - 1; i >= 0; i--) {
      const w = winnerData[i];
      const li = document.createElement('li');
      li.dataset.key = w.id;

      let displayLine = '';
      if (w.prizeAmounts && w.specialBonus) {
        displayLine = `【金額：${w.prizeAmounts.toLocaleString()} + 現金加碼：${w.specialBonus.toLocaleString()}】`;
      } else if (w.prizeAmounts) {
        displayLine = `【金額：${w.prizeAmounts.toLocaleString()}】`;
      } else if (w.specialBonus) {
        displayLine = `【金額：${w.specialBonus.toLocaleString()}】`;
      };

      let bonusLine = '';
      if (w.bonusSource) bonusLine = `<p style="color:#D67158;">【${w.bonusSource}-幸運分享】</p>`;
      else if (w.bonus2Source) bonusLine = `<p style="color:#D67158;">【${w.bonus2Source}】</p>`;

      li.innerHTML = `
        <p>${w.prize}${displayLine}：${w.dept} - ${w.name}</p>
        ${bonusLine}
      `;

      winnerLists.forEach(list => list.appendChild(li.cloneNode(true)));
    };

    updateCounts();
  } catch (e) {
    console.error('還原失敗，清除本場尾牙資料', e);
    localStorage.removeItem(`${STORAGE_KEY}_winnerData`);
    localStorage.removeItem(`${STORAGE_KEY}_drawnWinners`);
  };
})();



//刪除歷史紀錄

clearAllBtn.addEventListener('click', () => {
  if (winnerData.length === 0) return;

  // 顯示確認 toast
  const confirmBody = document.querySelector('#confirm-toast-body');
  confirmBody.innerHTML  = `
  <div class="text-center"
    <p>確定要移除<span class="text-danger">所有歷史名單</span>嗎？</p>
    <p>刪除後無法復原！</p>
  </div>`;

  const confirmToastEl = document.querySelector('#confirm-toast');
  const confirmToast = new bootstrap.Toast(confirmToastEl);
  confirmToast.show();

  const yesBtn = document.querySelector('#confirm-yes');
  const noBtn = document.querySelector('#confirm-no');

  const cleanup = () => {
    yesBtn.onclick = null;
    noBtn.onclick = null;
  };

  yesBtn.onclick = () => {
    cleanup();
    confirmToast.hide();

    // 清除記憶資料
    winnerData = [];
    drawnWinners.clear();

    // 清空畫面
    winnerLists.forEach(list => list.innerHTML = '');

    // 清除 localStorage
    localStorage.removeItem(`${STORAGE_KEY}_winnerData`);
    localStorage.removeItem(`${STORAGE_KEY}_drawnWinners`);

    //更新統計
    updateCounts();

    //成功 Toast
    const successBody = document.querySelector('#success-toast-body');
    successBody.innerHTML = `<p class="m-0">已清除所有中獎名單</p>`;
    const successToastEl = document.querySelector('#success-toast');
    const successToast = new bootstrap.Toast(successToastEl);
    successToast.show();
  };

  noBtn.onclick = () => {
    cleanup();
    confirmToast.hide();
  };
});

//拉霸高度用

function setStickOffset(px) {
  stickChang.style.transform = `translateY(calc(0% + ${px}px))`;
};

function getRemainingShareAmount(shareId) {
  const target = winnerData.find(w => w.id === shareId);
  if (!target) return 0;

  const originalAmount = target.prizeAmounts || 0;

  const usedShare = winnerData
    .filter(w => w.shareToId === shareId)
    .reduce((sum, w) => sum + (w.shareAmount || 0), 0);

  return originalAmount - usedShare;
};
