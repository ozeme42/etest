const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const isDebug = process.argv.includes('--debug');
const buildType = isDebug ? 'Debug' : 'Release';
const buildTypeLower = isDebug ? 'debug' : 'release';

function log(step, message) {
  const time = new Date().toLocaleTimeString('tr-TR');
  console.log(`\n\x1b[36m[${time}] [Adım ${step}]\x1b[0m \x1b[1m${message}\x1b[0m`);
}

function ensureEnvironment() {
  log(1, 'Geliştirme Ortamı ve JDK/SDK Kontrol Ediliyor...');

  // 1. JDK Tespiti
  const possibleJdks = [
    process.env.JAVA_HOME,
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.10.10-hotspot',
    'C:\\Program Files\\Java\\jdk-21',
    'C:\\Program Files\\Java\\jdk-17'
  ].filter(Boolean);

  let detectedJdk = null;
  for (const jdkPath of possibleJdks) {
    const javaExe = path.join(jdkPath, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (fs.existsSync(javaExe)) {
      detectedJdk = jdkPath;
      break;
    }
  }

  if (detectedJdk) {
    process.env.JAVA_HOME = detectedJdk;
    const binPath = path.join(detectedJdk, 'bin');
    if (!process.env.PATH.includes(binPath)) {
      process.env.PATH = `${binPath};${process.env.PATH}`;
    }
    console.log(`  ✓ JDK bulundu: ${detectedJdk}`);
  } else {
    console.warn('  ⚠️ JDK otomatik tespit edilemedi. Sistem varsayılan Java ortamı denenecek.');
  }

  // 2. Android SDK Tespiti
  const localAppData = process.env.LOCALAPPDATA || 'C:\\Users\\mahmut\\AppData\\Local';
  const possibleSdks = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(localAppData, 'Android', 'Sdk'),
    'C:\\Users\\mahmut\\AppData\\Local\\Android\\Sdk'
  ].filter(Boolean);

  let detectedSdk = null;
  for (const sdkPath of possibleSdks) {
    if (fs.existsSync(sdkPath)) {
      detectedSdk = sdkPath;
      break;
    }
  }

  if (detectedSdk) {
    process.env.ANDROID_HOME = detectedSdk;
    process.env.ANDROID_SDK_ROOT = detectedSdk;
    console.log(`  ✓ Android SDK bulundu: ${detectedSdk}`);
  } else {
    console.warn('  ⚠️ Android SDK otomatik tespit edilemedi. local.properties dosyası kullanılacak.');
  }
}

function runViteBuild() {
  log(2, 'React + Vite Web Uygulaması Derleniyor (Production)...');
  execSync('npm run build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env
  });
  console.log('  ✓ Vite derlemesi başarıyla tamamlandı.');
}

function runCapacitorSync() {
  log(3, 'Capacitor Android Varlıkları ve Eklentileri Senkronize Ediliyor...');
  execSync('npx cap sync android', {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env
  });
  console.log('  ✓ Capacitor senkronizasyonu tamamlandı.');
}

function runGradleBuild() {
  log(4, `Android Gradle ${buildType} APK Derleniyor (assemble${buildType})...`);
  const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  execSync(`${gradlewCmd} assemble${buildType}`, {
    cwd: androidDir,
    stdio: 'inherit',
    env: process.env
  });
  console.log(`  ✓ Gradle ${buildType} derlemesi başarıyla tamamlandı.`);
}

function copyAndReportApk() {
  log(5, 'APK Çıktısı Doğrulanıyor ve Dağıtıma Hazırlanıyor...');
  const sourceApkPath = path.join(
    androidDir,
    'app',
    'build',
    'outputs',
    'apk',
    buildTypeLower,
    `app-${buildTypeLower}.apk`
  );

  if (!fs.existsSync(sourceApkPath)) {
    throw new Error(`APK dosyası bulunamadı: ${sourceApkPath}`);
  }

  const targetReleaseApk = path.join(rootDir, `eTest-${buildType}.apk`);
  const targetStandardApk = path.join(rootDir, 'eTest.apk');

  fs.copyFileSync(sourceApkPath, targetReleaseApk);
  fs.copyFileSync(sourceApkPath, targetStandardApk);

  const stats = fs.statSync(targetStandardApk);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n======================================================');
  console.log('\x1b[32m\x1b[1m🎉 TAM KAPSAMLI APK BAŞARIYLA OLUŞTURULDU! 🎉\x1b[0m');
  console.log('======================================================');
  console.log(`📦 Paket Türü      : ${buildType} (Doğrudan Telefona Yüklenebilir)`);
  console.log(`📁 Ana APK         : ${targetStandardApk}`);
  console.log(`📁 İsimlendirilmiş : ${targetReleaseApk}`);
  console.log(`⚖️  Dosya Boyutu    : ${sizeMb} MB (${stats.size.toLocaleString('tr-TR')} bayt)`);
  console.log(`🕒 Tarih/Saat      : ${new Date().toLocaleString('tr-TR')}`);
  console.log('======================================================\n');
  console.log('📱 Telefondan Kurulum:');
  console.log('1. "eTest.apk" dosyasını USB, WhatsApp veya Google Drive ile Android telefonunuza gönderin.');
  console.log('2. Telefonda dosyaya dokunun ve "Yükle / Güncelle" seçeneğini onaylayın.');
  console.log('3. Bildirim ve kamera izinlerini onaylayarak tüm özellikleriyle kullanmaya başlayabilirsiniz!\n');
}

async function main() {
  const startTime = Date.now();
  try {
    ensureEnvironment();
    runViteBuild();
    runCapacitorSync();
    runGradleBuild();
    copyAndReportApk();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️ Toplam derleme süresi: ${duration} saniye.`);
  } catch (err) {
    console.error('\n\x1b[31m❌ DERLEME SIRASINDA HATA OLUŞTU:\x1b[0m', err.message);
    process.exit(1);
  }
}

main();
