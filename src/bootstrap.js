/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

/**
 * Get your API Key at http://api.imgur.com/
 */
const API_KEY = 'NOT A REAL API KEY';

Cu.import("resource:///modules/devtools/gcli.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(
  this, "LayoutHelpers", "resource:///modules/devtools/LayoutHelpers.jsm");

function install(aData, aReason) {}

function uninstall(aData, aReason) {}

function startup(aData, aReason) {
  /**
   * 'imgur' command
   */
  gcli.addCommand({
    name: "imgur",
    description: 'Upload an image of the page to imgur',
    manual: 'Uploads an image of the page (or a section) to the imgur image service',
    returnType: "string",
    params: [
      {
        name: "delay",
        type: { name: "number", min: 0 },
        defaultValue: 0,
        description: gcli.lookup("screenshotDelayDesc"),
        manual: gcli.lookup("screenshotDelayManual")
      },
      {
        name: "fullpage",
        type: "boolean",
        defaultValue: false,
        description: gcli.lookup("screenshotFullPageDesc"),
        manual: gcli.lookup("screenshotFullPageManual")
      },
      {
        name: "node",
        type: "node",
        defaultValue: null,
        description: gcli.lookup("inspectNodeDesc"),
        manual: gcli.lookup("inspectNodeManual")
      }
    ],

    exec: function Command_screenshot(args, context) {
      var document = context.environment.contentDocument;
      if (args.delay > 0) {
        var promise = context.createPromise();
        document.defaultView.setTimeout(function Command_screenshotDelay() {
          let reply = this.grabScreen(document);
          promise.resolve(reply);
        }.bind(this), args.delay * 1000);
        return promise;
      }
      else {
        return this.grabScreen(document, args.fullpage, args.node);
      }
    },

    grabScreen:
    function Command_screenshotGrabScreen(document, fullpage, node) {
      let window = document.defaultView;
      let canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
      let left = 0;
      let top = 0;
      let width;
      let height;

      if (!fullpage) {
        if (!node) {
          left = window.scrollX;
          top = window.scrollY;
          width = window.innerWidth;
          height = window.innerHeight;
        } else {
          let rect = LayoutHelpers.getRect(node, window);
          top = rect.top;
          left = rect.left;
          width = rect.width;
          height = rect.height;
        }
      } else {
        width = window.innerWidth + window.scrollMaxX;
        height = window.innerHeight + window.scrollMaxY;
      }
      canvas.width = width;
      canvas.height = height;

      let ctx = canvas.getContext("2d");
      ctx.drawWindow(window, left, top, width, height, "#fff");

      let data = canvas.toDataURL("image/png", "").split(',')[1];

      let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
      let openTab =
        function() {
          let wm =
            Cc["@mozilla.org/appshell/window-mediator;1"].
              getService(Ci.nsIWindowMediator);
          let last = wm.getMostRecentWindow("navigator:browser");
          let url = JSON.parse(req.responseText).upload.links.imgur_page;

          last.document.defaultView.openNewTabWith(url);
        };

      req.open('POST', 'http://api.imgur.com/2/upload.json', true);
      req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      req.addEventListener("load", openTab, false);
      req.send('type=base64&key=' + encodeURIComponent(API_KEY) +
               '&name=imgur-command-addon-sample.png' +
               '&image=' + encodeURIComponent(data));

      return "Uploaded!";
    }
  });
}

function shutdown(aData, aReason) {
  gcli.removeCommand("imgur");
}
