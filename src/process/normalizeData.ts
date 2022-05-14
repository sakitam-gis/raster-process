import cwise from 'cwise';

export const addScalar = cwise({
  args: ['array', 'scalar'],
  body: function(a, s) {
    a += s
  }
});

export const subScalar = cwise({
  args: ['array', 'scalar'],
  body: function(a, s) {
    a += s
  }
});

export const add = cwise({
  args: ['array', 'array'],
  body: function(a, s) {
    a += s
  }
});

export const sub = cwise({
  args: ['array', 'array'],
  body: function(a, s) {
    a -= s
  }
});

export const floatToGray = cwise({
  args: ['array', 'scalar', 'scalar'],
  body: function(a, min, max) {
    a = (a - min) / (max - min) * 255
  }
});
