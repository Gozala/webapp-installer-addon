/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false */


let { Cu } = require("chrome")
let { Widget } = require("widget")
let tabs = require("tabs")
let utils = require('api-utils/window-utils')
let { notify } = require("notifications")

Cu.import('resource:///modules/webappsUI.jsm', this)
Cu.import('resource:///modules/WebappsInstaller.jsm', this)


function Isolate(f) { return 'new ' + f }

let isolate = Isolate(function() {
  function addImageBySize(images, node) {
    let resolution = node.getAttribute('sizes')
    let size = resolution ? resolution.toLowerCase().split('x').pop() : '128'
    images[size] = images[size] || node.href
    return images
  }

  function getIcons() {
    let images = {}
    let shortcuts = document.querySelectorAll('link[rel="shortcut icon"]')
    images = shortcuts ? Array.reduce(shortcuts, addImageBySize, images)
                       : images

    let fluid = document.querySelector('link[rel=fluid-icon]')
    if (fluid) images["128"] = images["128"] || fluid.href

    let apple = document.querySelectorAll('link[rel="apple-touch-icon-precomposed"]')
    images = apple ? Array.reduce(apple, addImageBySize, images)
                   : images

    let apple = document.querySelectorAll('link[rel="apple-touch-icon"]')
    images = apple ? Array.reduce(apple, addImageBySize, images)
                   : images

    let og = document.querySelector('meta[property="og:image"]')
    if (og) images["128"] = images["128"] || og.content

    return images
  }

  function getName() {
    let node = document.querySelector('meta[property="og:site_name"]') ||
               document.querySelector('meta[property="og:title"]')
    return node ? node.content : document.title
  }

  function getDescription() {
    let node = document.querySelector('meta[property="og:description"]') ||
               document.querySelector('meta[name=description]') ||
               document.querySelector('meta[property="og:title"]')

    return node ? node.content : document.title
  }

  function getManifest() {
    return {
      name: getName(),
      origin: location.href,
      description: getDescription(),
      launch_path: location.pathname,
      icons: getIcons()
    }
  }

  self.postMessage(getManifest())
})

function onManifest(manifest) {
  this.destroy()

  let options = {
    from: manifest.origin,
    app: {
      manifest: manifest,
      manifestURL: manifest.origin + 'manifest.webapp',
      origin: manifest.origin
    }
  }

  let browser = utils.activeBrowserWindow

  console.log('Trynig to install', JSON.stringify(options, 2, 2))

  webappsUI.doInstall(options, browser, browser.window)

  console.log('no errors observed so we install anyway')

  WebappsInstaller.install(options)
  notify({
    title: "Installation is complete",
    text: "Application " + manifest.name + " was installed.",
    iconURL: manifest.icons['128'] || "chrome://browser/skin/webapps-64.png"
  })
}

let widget = Widget({
  id: "web-app",
  label: "Install as app",
  contentURL: "chrome://browser/skin/webapps-16.png",
  onClick: function() {
    tabs.activeTab.attach({ contentScript: isolate, onMessage: onManifest })
  }
})
