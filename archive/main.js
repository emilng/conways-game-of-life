var main = function () {
  var console = function(input) {
    document.getElementById("textContainer").innerHTML = input;
  };

  var canvas = document.getElementById('game');

  var ctx = canvas.getContext('2d');

  var width = canvas.width;
  var height = canvas.height;

  var imageData = ctx.getImageData(0,0,width,height);

  var buf = new ArrayBuffer(imageData.data.length);
  var buf8 = new Uint8ClampedArray(buf);
  var data = new Uint32Array(buf);

  var on = 0xff000000;
  var off = 0xffffffff;

  var x,y = 0;

  // bst = lookup table for how many bits set in an 8 bit chunk
  var bst = [];
  for (var i = 0; i < 256; i++) {
    bst[i] = 0;
    bst[i] = (i & 1) + bst[Math.round(i / 2)];
  }

  var bmpNext = [], bmp = [], bmp2 = [], bmp1 = [], bmp_clear = [];

  // account for empty values surrounding bitmap that eliminate need for bounds checking
  var bitmap_len = (height + 2) * (width + 2);

  // zero bitmap values
  while(bitmap_len--) {
    bmp_clear.push(0);
  }
  bmp1 = bmp_clear.slice(0);
  bmp2 = bmp_clear.slice(0);
  bmp = bmp1;
  bmpNext = bmp2;

  // randomize initial values
  var cell_on = 0;
  for (y=0; y<height; y++) {
    for (x=0; x<width; x++) {
      cell_on = (Math.round(Math.random()) > 0) ? 1 : 0;
      data[y * width + x] = cell_on ? on : off;
      bmp[(y + 1) * width + (x + 1)] = cell_on;
    }
  }

  setInterval(function(event) {
    // numbers for adding random kick to system
    var randx = Math.round(Math.random() * width);
    var randy = Math.round(Math.random() * height);

    for (y=0; y<height; y++) {
      for (x=0; x<width; x++) {

        var pos = ((y + 1) * width) + (x + 1); // current pos

        var r1 = (pos - width);//= y * width + x; // start of previous line
        var r3 = ((y + 2) * width) + x; // start of next line

        // get on/off values for cells surrounding current one
        var p1 = bmp[r1], p2 = bmp[r1 + 1], p3 = bmp[r1 + 2];
        var p4 = bmp[pos - 1], p5 = bmp[pos + 1];
        var p6 = bmp[r3], p7 = bmp[r3 + 1], p8 = bmp[r3 + 2];

        // combine on/off values into 8 bit number for looking up how many bits are set
        // 128, 64, 32, 16, 8, 4, 2
        var bits = p1 << 7 | p2 << 6 | p3 << 5 | p4 << 4 | p5 << 3 | p6 << 2 | p7 << 1 | p8;
        var bits_set = bst[bits];

        if ((bits_set == 2) && (bmp[pos] == 1)) {
          data[y * width + x] = on;
          bmpNext[pos] = 1;
        } else if (bits_set == 3) {
          data[y * width + x] = on;
          bmpNext[pos] = 1;
        } else if ((x == randx) && (y == randy)) { // add random kick to system
          data[y * width + x] = on;
          bmpNext[pos] = 1;
        } else {
          data[y * width + x] = off;
          bmpNext[pos] = 0;
        }

      }
    }

    imageData.data.set(buf8);

    ctx.putImageData(imageData, 0, 0);

    /*
    // clear old buffer
    if (bmp === bmp1) {
      bmp1 = bmp_clear.slice(0);
    } else {
      bmp2 = bmp_clear.slice(0);
    }
    */

    // swap bitmap buffers
    bmp = (bmp === bmp1) ? bmp2 : bmp1;
    bmpNext = (bmp === bmp1) ? bmp2 : bmp1;

  }, 15);

};