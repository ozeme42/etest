#!/usr/bin/env node

/**
 * Bu script Vercel hesabınızdaki eski ve kullanılmayan deployment'ları (dağıtımları)
 * toplu olarak silerek "Deployment Storage" ve "Functions Storage" kota aşımını çözer.
 * 
 * Kullanım:
 *   node scripts/clean-vercel-deployments.mjs <VERCEL_TOKEN>
 * 
 * Vercel Token alma adresi: https://vercel.com/account/tokens
 */

const token = process.argv[2] || process.env.VERCEL_TOKEN;

if (!token) {
  console.log(`
===================================================================
❌ VERCEL TOKEN GEREKLİ!
===================================================================
1. https://vercel.com/account/tokens adresine gidin.
2. "Create Token" butonuna tıklayıp yeni bir token oluşturun (Örn: "cleanup").
3. Ardından terminalde şu komutu çalıştırın:

   node scripts/clean-vercel-deployments.mjs BURAYA_TOKEN_YAZIN
===================================================================
`);
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10);
    console.log(`\n⏳ Rate limit aşıldı, ${retryAfter} saniye bekleniyor...`);
    await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
    return fetchJSON(url, options);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Hatası (${res.status}): ${text}`);
  }
  return res.json();
}

async function getDeploymentsForScope(scopeName, teamId = null) {
  console.log(`\n🔍 [${scopeName}] dağıtımları taranıyor...`);
  const queryParam = teamId ? `&teamId=${teamId}` : '';
  let deployments = [];
  let nextTimestamp = null;

  while (true) {
    let url = `https://api.vercel.com/v6/deployments?limit=100${queryParam}`;
    if (nextTimestamp) {
      url += `&until=${nextTimestamp}`;
    }

    let depRes;
    try {
      depRes = await fetchJSON(url);
    } catch (e) {
      console.error(`   ⚠️ Hata (${scopeName}):`, e.message);
      break;
    }

    const list = depRes.deployments || [];
    if (list.length === 0) break;

    deployments.push(...list);
    process.stdout.write(`\r   Bulunan dağıtım sayısı: ${deployments.length}`);

    if (list.length < 100 || !depRes.pagination?.next) {
      break;
    }
    nextTimestamp = depRes.pagination.next;
  }
  console.log('');
  return deployments;
}

async function cleanScopeDeployments(scopeName, deployments, teamId = null) {
  if (deployments.length === 0) {
    console.log(`ℹ️  [${scopeName}] için dağıtım bulunamadı.`);
    return;
  }

  // Grupla: her projenin en güncel 2 deployment'ı ve en son 'READY' olanı korunsun
  const keepIds = new Set();
  const byProject = {};

  for (const d of deployments) {
    const name = d.name || 'default';
    if (!byProject[name]) byProject[name] = [];
    byProject[name].push(d);
  }

  for (const [pName, deps] of Object.entries(byProject)) {
    deps.sort((a, b) => b.createdAt - a.createdAt);

    // En güncel 2 deployment'ı koru
    const newest = deps.slice(0, 2);
    newest.forEach(d => keepIds.add(d.uid));

    // Canlıda çalışan (READY) ilk deployment'ı da koru
    const ready = deps.find(d => d.state === 'READY');
    if (ready) keepIds.add(ready.uid);
  }

  const toDelete = deployments.filter(d => !keepIds.has(d.uid));

  console.log(`\n📊 [${scopeName}] Özet:`);
  console.log(`   - Toplam Dağıtım: ${deployments.length}`);
  console.log(`   - Korunacak Güncel Dağıtımlar: ${keepIds.size}`);
  console.log(`   - Silinecek Eski Dağıtımlar: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log(`   ✅ [${scopeName}] Silinecek eski dağıtım yok.`);
    return;
  }

  console.log(`\n🗑️  [${scopeName}] Eski dağıtımlar siliniyor...`);
  let deletedCount = 0;
  let failCount = 0;
  const teamParam = teamId ? `?teamId=${teamId}` : '';

  for (let i = 0; i < toDelete.length; i++) {
    const dep = toDelete[i];
    const depDate = new Date(dep.createdAt).toLocaleDateString('tr-TR');
    try {
      const delUrl = `https://api.vercel.com/v13/deployments/${dep.uid}${teamParam}`;
      const delRes = await fetch(delUrl, {
        method: 'DELETE',
        headers
      });

      if (delRes.ok) {
        deletedCount++;
        process.stdout.write(`\r   [${i + 1}/${toDelete.length}] Silindi: ${dep.name} (${depDate}) - Toplam: ${deletedCount}`);
      } else if (delRes.status === 429) {
        const retryAfter = 5;
        console.log(`\n   ⏳ Rate limit. ${retryAfter} sn bekleniyor...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        i--;
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }

    // Kısa bekleme
    await new Promise(r => setTimeout(r, 120));
  }

  console.log(`\n   ✅ [${scopeName}] Tamamlandı: ${deletedCount} eski dağıtım silindi, ${failCount} atlandı.`);
}

async function main() {
  console.log('🚀 Vercel Temizlik Aracı Başlatılıyor...');

  // 1. Kullanıcı doğrula
  const userRes = await fetchJSON('https://api.vercel.com/v2/user');
  console.log(`👤 Giriş yapıldı: ${userRes.user?.username || userRes.user?.email}`);

  // 2. Takımları çek
  const teamsRes = await fetchJSON('https://api.vercel.com/v2/teams');
  const teams = teamsRes.teams || [];

  // Kişisel hesap dağıtımları
  const personalDeployments = await getDeploymentsForScope('Kişisel Hesap', null);
  await cleanScopeDeployments('Kişisel Hesap', personalDeployments, null);

  // Takım dağıtımları
  for (const team of teams) {
    const teamDeployments = await getDeploymentsForScope(`Takım: ${team.name || team.slug}`, team.id);
    await cleanScopeDeployments(`Takım: ${team.name || team.slug}`, teamDeployments, team.id);
  }

  console.log('\n=======================================================');
  console.log('🎉 TÜM TEMİZLİK İŞLEMİ TAMAMLANDI!');
  console.log('Eski dağıtımlar silindi, 10 GB limitinin çok altına inildi.');
  console.log('Vercel Usage panelinin güncellenmesi biraz zaman alabilir.');
  console.log('=======================================================\n');
}

main().catch(err => {
  console.error('\n❌ Hata:', err.message);
});
