/**
 * Client Fingerprint — collects browser, OS, device, network, and hardware info.
 *
 * Attached to spans via HAI3SpanProcessor for per-client performance analysis.
 * Cached after first call (client info does not change within a session).
 * Fail-open: returns empty record on any error.
 */

type ClientAttributes = Record<string, string | number | boolean>;

function parseUserAgent(): { browser: string; browserVersion: string; os: string; osVersion: string; deviceType: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let browser = 'unknown', browserVersion = '', os = 'unknown', osVersion = '', deviceType = 'desktop';

  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\S+)/)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    browserVersion = ua.match(/Edg\/(\S+)/)?.[1] || '';
  } else if (ua.includes('OPR/') || ua.includes('Opera')) {
    browser = 'Opera';
    browserVersion = ua.match(/(?:OPR|Opera)\/(\S+)/)?.[1] || '';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\S+)/)?.[1] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\/(\S+)/)?.[1] || '';
  }

  if (ua.includes('Windows NT')) {
    os = 'Windows';
    const ntVer = ua.match(/Windows NT (\d+\.\d+)/)?.[1] || '';
    const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
    osVersion = map[ntVer] || ntVer;
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
    osVersion = (ua.match(/Mac OS X ([\d_]+)/)?.[1] || '').replace(/_/g, '.');
  } else if (ua.includes('Android')) {
    os = 'Android';
    osVersion = ua.match(/Android ([\d.]+)/)?.[1] || '';
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os = 'iOS';
    osVersion = (ua.match(/OS ([\d_]+)/)?.[1] || '').replace(/_/g, '.');
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

let _cached: ClientAttributes | null = null;

/** Collect client fingerprint attributes. Cached after first call. */
export function getClientInfo(): ClientAttributes {
  if (_cached) return _cached;

  try {
    const { browser, browserVersion, os, osVersion, deviceType } = parseUserAgent();
    interface NavigatorWithConnection extends Navigator {
      connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
      mozConnection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
      webkitConnection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
    }
    const nav: NavigatorWithConnection | null = typeof navigator !== 'undefined' ? navigator : null;
    const scr = typeof screen !== 'undefined' ? screen : null;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    const gl = getWebGLInfo();

    _cached = {
      'client.browser.name': browser,
      'client.browser.version': browserVersion,
      'client.os.name': os,
      'client.os.version': osVersion,
      'client.device.type': deviceType,
      'client.language': nav?.language || 'unknown',
      'client.timezone': Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || 'unknown',
      'client.screen.width': scr?.width || 0,
      'client.screen.height': scr?.height || 0,
      'client.screen.pixel_ratio': typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      'client.viewport.width': typeof window !== 'undefined' ? window.innerWidth : 0,
      'client.viewport.height': typeof window !== 'undefined' ? window.innerHeight : 0,
      'client.cpu_cores': nav?.hardwareConcurrency || 0,
      'client.touch_support': 'ontouchstart' in (typeof window !== 'undefined' ? window : {}),
      'client.connection.type': String(conn?.effectiveType || 'unknown'),
      'client.connection.downlink_mbps': Number(conn?.downlink || 0),
      'client.connection.rtt_ms': Number(conn?.rtt || 0),
      'client.webgl_renderer': gl.renderer,
      'client.webgl_vendor': gl.vendor,
    };
  } catch { /* fail-open: return empty attrs if fingerprinting fails */
    _cached = {};
  }

  return _cached;
}
