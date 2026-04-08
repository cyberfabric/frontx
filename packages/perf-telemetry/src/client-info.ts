/**
 * Client Fingerprint — collects browser, OS, device, network, and hardware info.
 *
 * Attached to spans via HAI3SpanProcessor for per-client performance analysis.
 * Cached after first call (client info does not change within a session).
 * Fail-open: returns empty record on any error.
 */

type ClientAttributes = Record<string, string | number | boolean>;

function detectBrowser(ua: string): { browser: string; browserVersion: string } {
  let browser = 'unknown', browserVersion = '';

  // iOS-specific browser tokens (must check before generic Chrome/Firefox/Edge)
  if (ua.includes('CriOS/')) {
    browser = 'Chrome (iOS)';
    browserVersion = (/CriOS\/(\S+)/).exec(ua)?.[1] || '';
  } else if (ua.includes('FxiOS/')) {
    browser = 'Firefox (iOS)';
    browserVersion = (/FxiOS\/(\S+)/).exec(ua)?.[1] || '';
  } else if (ua.includes('EdgiOS/')) {
    browser = 'Edge (iOS)';
    browserVersion = (/EdgiOS\/(\S+)/).exec(ua)?.[1] || '';
  } else if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    browserVersion = (/Firefox\/(\S+)/).exec(ua)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    browserVersion = (/Edg\/(\S+)/).exec(ua)?.[1] || '';
  } else if (ua.includes('OPR/') || ua.includes('Opera')) {
    browser = 'Opera';
    browserVersion = (/(?:OPR|Opera)\/(\S+)/).exec(ua)?.[1] || '';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    browser = 'Chrome';
    browserVersion = (/Chrome\/(\S+)/).exec(ua)?.[1] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
    browserVersion = (/Version\/(\S+)/).exec(ua)?.[1] || '';
  }

  return { browser, browserVersion };
}

function detectOS(ua: string): { os: string; osVersion: string; deviceType: string } {
  let os = 'unknown', osVersion = '', deviceType = 'desktop';

  // iOS detection BEFORE macOS (iPad user agents contain "Mac OS X")
  if (/iPhone|iPad|iPod/.test(ua)) {
    os = 'iOS';
    osVersion = ((/OS ([\d_]+)/).exec(ua)?.[1] || '').replaceAll('_', '.');
  } else if (ua.includes('Windows NT')) {
    os = 'Windows';
    const ntVer = (/Windows NT (\d+\.\d+)/).exec(ua)?.[1] || '';
    const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
    osVersion = map[ntVer] || ntVer;
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
    osVersion = ((/Mac OS X ([\d_]+)/).exec(ua)?.[1] || '').replaceAll('_', '.');
  } else if (ua.includes('Android')) {
    os = 'Android';
    osVersion = (/Android ([\d.]+)/).exec(ua)?.[1] || '';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('CrOS')) {
    os = 'ChromeOS';
  }

  if (/Mobi|Android.*Mobile|iPhone|iPod/.test(ua)) {
    deviceType = 'mobile';
  } else if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) {
    deviceType = 'tablet';
  }

  return { os, osVersion, deviceType };
}

function parseUserAgent(): { browser: string; browserVersion: string; os: string; osVersion: string; deviceType: string } {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const { browser, browserVersion } = detectBrowser(ua);
  const { os, osVersion, deviceType } = detectOS(ua);
  return { browser, browserVersion, os, osVersion, deviceType };
}


function getWebGLInfo(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        return {
          renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'unknown',
          vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || 'unknown',
        };
      }
    }
  } catch { /* fail-open */ }
  return { renderer: 'unknown', vendor: 'unknown' };
}

let _cachedBasic: ClientAttributes | null = null;
let _cachedFull: ClientAttributes | null = null;

/** Collect client fingerprint attributes. High-cardinality fields only included when includeDebugData is true. */
export function getClientInfo(includeDebugData = false): ClientAttributes {
  if (includeDebugData && _cachedFull) return _cachedFull;
  if (!includeDebugData && _cachedBasic) return _cachedBasic;

  try {
    const { browser, browserVersion, os, osVersion, deviceType } = parseUserAgent();
    interface NavigatorWithConnection extends Navigator {
      connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
      mozConnection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
      webkitConnection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
    }
    const nav: NavigatorWithConnection | null = typeof navigator === 'undefined' ? null : navigator;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;

    // Basic attributes — always included (low cardinality)
    const attrs: ClientAttributes = {
      'client.browser.name': browser,
      'client.browser.version': browserVersion,
      'client.os.name': os,
      'client.os.version': osVersion,
      'client.device.type': deviceType,
      'client.connection.type': String(conn?.effectiveType || 'unknown'),
    };

    // High-cardinality attributes — only when debug data is enabled
    if (includeDebugData) {
      const scr = typeof screen === 'undefined' ? null : screen;
      const gl = getWebGLInfo();
      attrs['client.language'] = nav?.language || 'unknown';
      attrs['client.timezone'] = Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || 'unknown';
      attrs['client.screen.width'] = scr?.width || 0;
      attrs['client.screen.height'] = scr?.height || 0;
      attrs['client.screen.pixel_ratio'] = typeof globalThis.window === 'undefined' ? 1 : globalThis.window.devicePixelRatio || 1;
      attrs['client.viewport.width'] = typeof globalThis.window === 'undefined' ? 0 : globalThis.window.innerWidth;
      attrs['client.viewport.height'] = typeof globalThis.window === 'undefined' ? 0 : globalThis.window.innerHeight;
      attrs['client.cpu_cores'] = nav?.hardwareConcurrency || 0;
      attrs['client.touch_support'] = 'ontouchstart' in (typeof globalThis.window === 'undefined' ? {} : globalThis.window);
      attrs['client.connection.downlink_mbps'] = Number(conn?.downlink || 0);
      attrs['client.connection.rtt_ms'] = Number(conn?.rtt || 0);
      attrs['client.webgl_renderer'] = gl.renderer;
      attrs['client.webgl_vendor'] = gl.vendor;
      _cachedFull = attrs;
    } else {
      _cachedBasic = attrs;
    }
    return attrs;
  } catch { /* fail-open: return empty attrs if fingerprinting fails */
    return {};
  }
}
