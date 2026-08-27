import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Initializes Native Mobile App features:
 * - Configures Status Bar & hides Splash Screen smoothly
 * - Hooks Android hardware back button
 */
export async function initNativeApp(navigate) {
  try {
    // 1. Hide Splash Screen after app load
    await SplashScreen.hide().catch(() => {});

    // 2. Hide Status Bar completely (Fullscreen Immersive App Experience)
    await StatusBar.hide().catch(() => {});
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

    // 3. Android Back Button handling
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && navigate) {
        navigate(-1);
      } else {
        App.exitApp();
      }
    });

    // 4. Request Notification permissions
    await LocalNotifications.requestPermissions().catch(() => {});
  } catch (e) {
    console.warn('[NativeMobile] Initialization notice:', e?.message);
  }
}

/**
 * Captures a photo using the phone's native camera or image gallery.
 * Returns base64 image data URL ready to embed or upload.
 */
export async function takeNativePhoto(source = 'camera') {
  try {
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    });
    return image.dataUrl;
  } catch (e) {
    console.warn('[NativeMobile] Camera capture canceled or failed:', e?.message);
    return null;
  }
}

/**
 * Triggers a subtle tactile haptic vibration (useful for bubble selection or button taps).
 */
export async function triggerHapticFeedback(style = 'light') {
  try {
    const impactMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: impactMap[style] || ImpactStyle.Light });
  } catch (e) {
    // Silent fail on desktop browsers
  }
}

/**
 * Schedules a daily study goal reminder notification on the phone.
 */
export async function scheduleDailyStudyReminder(hour = 20, minute = 0) {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 101,
          title: '📚 Günlük Çalışma Hatırlatıcısı',
          body: 'Bugünkü soru hedefine ulaşmak için hazırlan! Birkaç dakikalık çalışma başarın için harika bir adım.',
          schedule: {
            on: { hour, minute },
            repeats: true,
          },
          actionTypeId: '',
          extra: null,
        },
      ],
    });
  } catch (e) {
    console.warn('[NativeMobile] Notification schedule notice:', e?.message);
  }
}
