inlets = 1;
outlets = 1;

function list() {
// DEBUG: post input
// post(arguments[0], arguments[1], arguments[2], arguments[3]);

// wall left: (x0, y0) (x0, y1) line
outlet(0, arguments[0], arguments[1], arguments[0], arguments[3]);

// wall top: (x0, y0) (x1, y0) line
outlet(0, arguments[0], arguments[1], arguments[2], arguments[1]);

// wall right: (x1, y0) (x1, y1) line
outlet(0, arguments[2], arguments[1], arguments[2], arguments[3]);

// wall bottom: (x0, y1) (x1, y1) line
outlet(0, arguments[0], arguments[3], arguments[2], arguments[3]);

}