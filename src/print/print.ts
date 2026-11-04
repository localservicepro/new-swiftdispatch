/* Hand a finished HTML document to the browser's own print dialogue.

   A hidden iframe rather than window.open: a popup blocker can swallow a new
   window, and a new tab flashes the document at whoever is standing at the
   counter. The iframe carries its own <style>, so nothing from the admin
   shell — dark theme included — can reach the page that comes out. */

export function printDocument(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("title", "Print");
  /* Given a real A4 box and parked off-screen, rather than collapsed to 0×0:
     a frame with no height gives the print layout nothing to paginate against,
     and a multi-page job can come out as a single page. */
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    /* Chrome tears the dialogue down asynchronously; removing the frame the
       instant afterprint fires can cancel the job mid-spool. */
    setTimeout(() => frame.remove(), 1500);
  };

  const go = () => {
    win.focus();
    win.print();
    cleanup();
  };

  /* The logo is a data URI, but Chrome still prints an empty box if the image
     has not decoded when print() is called. Wait for it. */
  const images = Array.from(doc.images);
  const ready = Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
    )
  );

  win.addEventListener("afterprint", cleanup);
  /* A print dialogue that never opens should not leak an iframe forever. */
  setTimeout(cleanup, 120_000);
  void ready.then(() => setTimeout(go, 60));
}
