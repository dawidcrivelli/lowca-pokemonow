/* Cienki klient CDP na wbudowanym WebSocket Node'a. */
module.exports = class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.handlers = {}; }
  on(method, fn) { this.handlers[method] = fn; }
  open() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => res();
      this.ws.onerror = e => rej(e);
      this.ws.onmessage = ev => {
        const m = JSON.parse(ev.data);
        if (m.id && this.pending.has(m.id)) { this.pending.get(m.id)(m.result || m.error); this.pending.delete(m.id); }
        else if (m.method && this.handlers[m.method]) this.handlers[m.method](m.params);
      };
    });
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise(res => {
      this.pending.set(id, res);
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); res({}); } }, 15000);
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
};
