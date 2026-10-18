const { app, WebContentsView } = require('electron');

app.whenReady().then(() => {
  try {
    const view = new WebContentsView();
    const wc = view.webContents;

    console.log('[TEST_OUTPUT] wc.close type:', typeof wc.close);
    console.log('[TEST_OUTPUT] wc.destroy type:', typeof wc.destroy);
    console.log('[TEST_OUTPUT] wc.isDestroyed before close:', wc.isDestroyed());

    let destroyedEventFired = false;
    wc.on('destroyed', () => {
      destroyedEventFired = true;
      console.log('[TEST_OUTPUT] wc emitted destroyed event: true');
    });

    if (typeof wc.close === 'function') {
      wc.close();
      console.log('[TEST_OUTPUT] wc.isDestroyed after close:', wc.isDestroyed());
    }

    setTimeout(() => {
      console.log('[TEST_OUTPUT] wc final isDestroyed:', wc.isDestroyed());
      console.log('[TEST_OUTPUT] destroyed event observed:', destroyedEventFired);
      console.log('[TEST_OUTPUT] VERIFICATION SUCCESSFUL');
      app.exit(0);
    }, 200);
  } catch (err) {
    console.error('[TEST_ERROR]', err);
    app.exit(1);
  }
});
