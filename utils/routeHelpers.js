
const simpleOutput = (out, res, env) => {
  if (!out.ok) {
    if (typeof out.data.status === 'number') {
      res.status(out.data.status);
    } else {
      res.status(500);
    }
    if (!('msg' in out.data) && 'code' in out.data) {
      out.data.msg = out.data.code.toLowerCase().replace(/_/g, ' ');
      out.data.msg = out.data.msg.charAt(0).toUpperCase() + out.data.msg.slice(1);
    }
    if ('dev' in out.data && env !== 'development') {
      delete(out.data.dev);
    }
    res.json(out.data);
  } else {
    res.json({ code: 'SUCCESS', msg: 'Success', data: out.data });
  }
};

module.exports = {
  simpleOutput
};

