
var data = {
  canvas: null,
  ctx: null,
  width: null,
  height: null,
  scaledWidth: 200,
  scaledHeight: 200,
  cellSize: 1,
  refreshRate: 1,
  imageData: null,
  buf: null,
  buf8: null,
  buf32: null,
  bmp1: null,
  bmp2: null,
  bmp: null,
  bmpNext: null,
  bst: null,
  on: 0xff000000,
  off: 0xffffffff,
  updated: true,
  widthUpdated: false,
  heightUpdated: false,
  previousTime: 0
};

var randomizeBitmap = function(data) {
  var cellOn = 0;
  for (var y = 0; y < data.height; y++) {
    for (var x = 0; x < data.width; x++) {
      cellOn = (Math.round(Math.random()) > 0) ? 1 : 0;
      data.buf32[y * data.width + x] = cellOn ? data.on : data.off;
      data.bmp[( (y + 1) * (data.width + 2) ) + (x + 1)] = cellOn;
    }
  }
};

// bst = lookup table for how many bits set in an 8 bit chunk
var getBitsSetTable = function() {
  var bst = [];
  for (var i = 0; i < 256; i++) {
    bst[i] = 0;
    bst[i] = (i & 1) + bst[Math.floor(i / 2)];
  }
  return bst;
};

var init = function(data) {
  data.canvas = document.getElementById('js-stage');
  data.ctx = data.canvas.getContext('2d');
  data.bst = getBitsSetTable();
};

var initSlider = function(id, value, min, max) {
  var slider = document.getElementById(id);
  slider.value = value;
  slider.min = min;
  slider.max = max;
  return slider;
};

var initDisplay = function(id, value) {
  var display = document.getElementById(id);
  display.textContent = value;
  return display;
};

var initUI = function(data) {
  var widthRange = initSlider('js-width-range', data.canvas.width, 10, 600);
  var widthDisplay = initDisplay('js-width-display', data.canvas.width);
  var heightRange = initSlider('js-height-range', data.canvas.height, 10, 600);
  var heightDisplay = initDisplay('js-height-display', data.canvas.height);
  var cellSizeRange = initSlider('js-cell-size-range', 1, 1, 20);
  var cellSizeDisplay = initDisplay('js-cell-size-display', 1);
  var refreshRateRange = initSlider('js-refresh-rate-range', 1, 1, 1000);
  var refreshRateDisplay = initDisplay('js-refresh-rate-display', 1);
  var cellAndRefreshRange = initSlider('js-cell-and-refresh-range', 1, 1, 100);

  widthRange.addEventListener('input', function(e) {
    data.scaledWidth = e.target.value;
    widthDisplay.textContent = data.scaledWidth;
    data.canvas.style.width = data.scaledWidth;
    data.width = Math.max(1, data.scaledWidth / data.cellSize);
    data.widthUpdated = true;
    data.updated = true;
  });

  heightRange.addEventListener('input', function(e) {
    data.scaledHeight = parseInt(e.target.value, 10);
    heightDisplay.textContent = data.scaledHeight;
    data.canvas.style.height = data.scaledHeight;
    data.height = Math.max(1, data.scaledHeight / data.cellSize);
    data.heightUpdated = true;
    data.updated = true;
  });

  cellSizeDisplay.textContent = 1;
  var updateCellSize = function(cellSize) {
    data.cellSize = cellSize;
    cellSizeDisplay.textContent = cellSize;
    data.canvas.style.width = data.scaledWidth;
    data.canvas.style.height = data.scaledHeight;
    data.width = Math.max(1, data.scaledWidth / cellSize);
    data.height = Math.max(1, data.scaledHeight / cellSize);
    data.widthUpdated = true;
    data.heightUpdated = true;
    data.updated = true;
  };
  cellSizeRange.addEventListener('input', function(e) {
    updateCellSize(parseInt(e.target.value, 10));
  });

  var updateRefreshRate = function(refreshRate) {
    data.refreshRate = refreshRate;
    refreshRateDisplay.textContent = refreshRate;
  };
  refreshRateRange.addEventListener('input', function(e) {
    updateRefreshRate(parseInt(e.target.value, 10));
  });

  cellAndRefreshRange.addEventListener('input', function(e) {
    var ratio = parseInt(e.target.value, 10) / 100;
    var cellSize = Math.ceil(ratio * cellSizeRange.max);
    cellSizeRange.value = cellSize;
    updateCellSize(cellSize);
    var refreshRate = Math.ceil(ratio * refreshRateRange.max);
    updateRefreshRate(refreshRate);
    refreshRateRange.value = refreshRate;
  });
};

var updateData = function(data) {
  if (data.widthUpdated) {
    data.canvas.width = data.width;
    data.widthUpdated = false;
  }
  if (data.heightUpdated) {
    data.canvas.height = data.height;
    data.heightUpdated = false;
  }
  data.width = data.canvas.width;
  data.height = data.canvas.height;
  data.imageData = data.ctx.getImageData(0, 0, data.width, data.height);

  data.buf = new ArrayBuffer(data.imageData.data.length);
  data.buf8 = new Uint8ClampedArray(data.buf);
  data.buf32 = new Uint32Array(data.buf);

  // account for empty values surrounding bitmap that eliminate need for bounds checking
  var bitmapLen = (data.height + 2) * (data.width + 2);

  var bmpClear = [];

  // zero bitmap values
  while(bitmapLen--) {
    bmpClear.push(0);
  }
  data.bmp1 = bmpClear.slice(0);
  data.bmp2 = bmpClear.slice(0);
  data.bmp = data.bmp1;
  data.bmpNext = data.bmp2;

  randomizeBitmap(data);
};

var render = function(data) {
  var width = data.width;
  var height = data.height;
  var imageData = data.imageData;
  var on = data.on;
  var off = data.off;
  var bst = data.bst;
  var buf32 = data.buf32;
  var bmp1 = data.bmp1;
  var bmp2 = data.bmp2;
  var bmp = data.bmp;
  var bmpNext = data.bmpNext;

  // numbers for adding random kick to system
  var randx = Math.round(Math.random() * width);
  var randy = Math.round(Math.random() * height);

  var bitsSetArray = [];

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {

      var pos = (( y + 1) * (width + 2) ) + (x + 1); // current pos

      var r1 = (y * (width + 2)) + x; // start of previous line
      var r3 = ((y + 2) * (width + 2)) + x; // start of next line

      /*
        get on/off values for cells surrounding current one in the arrangement below
        p1 p2 p3
        p4    p5
        p6 p7 p8
      */
      var p1 = bmp[r1], p2 = bmp[r1 + 1], p3 = bmp[r1 + 2];
      var p4 = bmp[pos - 1], p5 = bmp[pos + 1];
      var p6 = bmp[r3], p7 = bmp[r3 + 1], p8 = bmp[r3 + 2];

      // combine on/off values into 8 bit number for looking up how many bits are set
      // 128, 64, 32, 16, 8, 4, 2
      var bits = p1 << 7 | p2 << 6 | p3 << 5 | p4 << 4 | p5 << 3 | p6 << 2 | p7 << 1 | p8;
      var bitsSet = bst[bits];

      bitsSetArray.push(bitsSet);

      // keep cell alive if current cell is alive and surrounded by 2 living cells
      if ((bitsSet === 2) && (bmp[pos] === 1)) {
        buf32[y * width + x] = on;
        bmpNext[pos] = 1;
      // turn/keep current cell alive if cell is surrounded by 3 living cells
      } else if (bitsSet === 3) {
        buf32[y * width + x] = on;
        bmpNext[pos] = 1;
      // add random kick to system
      } else if ((x === randx) && (y === randy)) {
        buf32[y * width + x] = on;
        bmpNext[pos] = 1;
      // turn off any other cells
      } else {
        buf32[y * width + x] = off;
        bmpNext[pos] = 0;
      }

    }
  }

  imageData.data.set(data.buf8);

  data.ctx.putImageData(imageData, 0, 0);

  // swap bitmap buffers
  if (bmp === bmp1) {
    data.bmp = bmp2;
    data.bmpNext = bmp1;
  } else {
    data.bmp = bmp1;
    data.bmpNext = bmp2;
  }
};

var getUpdateHandler = function(data) {

  var update = function() {
    if (data.updated) {
      data.updated = false;
      updateData(data);
      render(data);
    } else {
      var currentTime = new Date().getTime();
      if (currentTime - data.previousTime > data.refreshRate) {
        render(data);
        data.previousTime = currentTime;
      }
    }

    requestAnimationFrame(update);
  };
  return update;
};

init(data);
initUI(data);

var update = getUpdateHandler(data);

requestAnimationFrame(update);

