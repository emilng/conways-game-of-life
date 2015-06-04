var main = function () {
  var console = function(input) {
    document.getElementById("textContainer").innerHTML = input;
  };

  var canvas = document.getElementById('canvas');

  var ctx = canvas.getContext('2d');

  var width = canvas.width;
  var height = canvas.height;

  var imageData = ctx.getImageData(0,0,width,height);

  var buf = new ArrayBuffer(imageData.data.length);
  var buf8 = new Uint8ClampedArray(buf);
  var data = new Uint32Array(buf);

  var on = 0xff000000;
  var off = 0xffffffff;

  var i = 0, j = 0, x = 0, y = 0;

  // bst = lookup table for how many bits set in an 8 bit chunk
  var bst = [];
  for (i = 0; i < 256; i++) {
    bst[i] = 0;
    bst[i] = (i & 1) + bst[Math.floor(i / 2)];
  }

  var bmp_next = [], bmp = [], bmp2 = [], bmp1 = [], bmp_clear = [];

  // account for empty values surrounding bitmap that eliminate need for bounds checking
  var bitmap_len = (height + 2) * (width + 2);

  // zero bitmap values
  while(bitmap_len--) {
    bmp_clear.push(0);
  }
  bmp1 = bmp_clear.slice(0);
  bmp2 = bmp_clear.slice(0);
  bmp = bmp1;
  bmp_next = bmp2;

  // randomize initial values
  var cell_on = 0;
  for (y=0; y<height; y++) {
    for (x=0; x<width; x++) {
      cell_on = (Math.round(Math.random()) > 0) ? 1 : 0;
      data[y * width + x] = cell_on ? on : off;
      bmp[( (y + 1) * (width + 2) ) + (x + 1)] = cell_on;
    }
  }

  var iteration = 0;
  var bits_str;
  var break_step = -1;
  setInterval(function(event) {
    // numbers for adding random kick to system
    var randx = Math.round(Math.random() * width);
    var randy = Math.round(Math.random() * height);

    var bits_set_array = [];
    if (iteration == 0) {
      bits_str = "";
    }
    for (y=0; y<height; y++) {
      for (x=0; x<width; x++) {

        var pos = (( y + 1) * (width + 2) ) + (x + 1); // current pos

        var r1 = (y * (width + 2)) + x; // start of previous line
        var r3 = ((y + 2) * (width + 2)) + x; // start of next line

        // get on/off values for cells surrounding current one
        var p1 = bmp[r1], p2 = bmp[r1 + 1], p3 = bmp[r1 + 2];
        var p4 = bmp[pos - 1], p5 = bmp[pos + 1];
        var p6 = bmp[r3], p7 = bmp[r3 + 1], p8 = bmp[r3 + 2];

        // combine on/off values into 8 bit number for looking up how many bits are set
        // 128, 64, 32, 16, 8, 4, 2
        var bits = p1 << 7 | p2 << 6 | p3 << 5 | p4 << 4 | p5 << 3 | p6 << 2 | p7 << 1 | p8;
        var bits_set = bst[bits];

        if (iteration == break_step) {
          bits_str = bits_str + p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8 + " " + bits + " " + bits_set + "<br />";
        }
        bits_set_array.push(bits_set);

        if ((bits_set == 2) && (bmp[pos] == 1)) {
          data[y * width + x] = on;
          bmp_next[pos] = 1;
        } else if (bits_set == 3) {
          data[y * width + x] = on;
          bmp_next[pos] = 1;
        } else if ((x == randx) && (y == randy)) { // add random kick to system
          data[y * width + x] = on;
          bmp_next[pos] = 1;
        } else {
          data[y * width + x] = off;
          bmp_next[pos] = 0;
        }

      }
    }

    if ( iteration == break_step) {
      var bmp_len = bmp.length;
      var bmp_str = "";
      var bmp_next_str = "";
      var bits_set_str = "";
      while (j < bmp_len) {
        if ((j > 0) && (j % (width + 2) == 0)) {
          bmp_str = bmp_str + "<br />";
          bmp_next_str = bmp_next_str + "<br />";
        }

        if ((j > 0) && (j < bits_set_array.length) && (j % width == 0)) {
          bits_set_str = bits_set_str + "<br />";
        }

        bmp_str = bmp_str + bmp[j];
        bmp_next_str = bmp_next_str + bmp_next[j];
        if (j < bits_set_array.length) {
          bits_set_str = bits_set_str + bits_set_array[j];
        }
        j++;
      }
      console(bmp_str + "<br /><br />" + bmp_next_str + "<br /><br />" + bits_set_str + "<br /><br />" + bits_str);
    }
    iteration++;

    imageData.data.set(buf8);

    ctx.putImageData(imageData, 0, 0);

    // swap bitmap buffers
    bmp = (bmp === bmp1) ? bmp2 : bmp1;
    bmp_next = (bmp === bmp1) ? bmp2 : bmp1;

  }, 20);

};