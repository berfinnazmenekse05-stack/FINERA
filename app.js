document.addEventListener('DOMContentLoaded', () => {
    try {
        // Safe Chart helper
        const safeNewChart = (ctx, config) => {
            if (typeof Chart === 'undefined') {
                console.error("Chart.js library is not loaded. Cannot render chart.");
                return null;
            }
            try {
                return new Chart(ctx, config);
            } catch (e) {
                console.error("Error creating chart:", e);
                return null;
            }
        };

        // DOM Elements - Auth & App Wrappers
    const authWrapper = document.getElementById('auth-wrapper');
    const appWrapper = document.getElementById('app-wrapper');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    
    // Auth Forms
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const goToSignup = document.getElementById('go-to-signup');
    const goToLogin = document.getElementById('go-to-login');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const logoutBtn = document.getElementById('logout-btn');

    // DOM Elements - User Profile
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const userAvatarInitial = document.getElementById('user-avatar-initial');

    // Chart instances
    let lineChartInstance = null;
    let pieChartInstance = null;
    let forecastChartInstance = null;
    let liquidityGaugeInstance = null;
    let riskScoreHistoryInstance = null;
    let headerRiskGaugeInstance = null;
    let marketSparklines = []; // For currency sparklines cleanup
    let wealthForecastChartInstance = null;

    // Currency Formatter
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatTL = (amount) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(amount);
    };

    const convertToUSD = (amount, currency) => {
        const amt = parseFloat(amount) || 0;
        const cur = (currency || 'USD').toUpperCase();
        if (cur === 'USD') return amt;
        if (cur === 'TRY') return amt / 34.0;
        if (cur === 'EUR') return amt * 1.08;
        if (cur === 'GBP') return amt * 1.28;
        return amt;
    };

    const convertToTRY = (amount, currency) => {
        const amt = parseFloat(amount) || 0;
        const cur = (currency || 'USD').toUpperCase();
        if (cur === 'TRY') return amt;
        if (cur === 'USD') return amt * 34.0;
        if (cur === 'EUR') return amt * 34.0 * 1.08;
        if (cur === 'GBP') return amt * 34.0 * 1.28;
        return amt * 34.0;
    };

    const formatTransactionAmount = (amount, currency) => {
        const cur = (currency || 'USD').toUpperCase();
        if (cur === 'TRY') {
            return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
        } else if (cur === 'EUR') {
            return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
        } else if (cur === 'GBP') {
            return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
        } else {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
        }
    };

    const calculateAnnualCostRate = (amount, maturity, monthlyInstallment, allocationFee) => {
        if (monthlyInstallment === 0 || amount === 0) return 0;
        const netAmount = amount - allocationFee;
        let low = 0;
        let high = 1.0;
        let r = 0.05;
        for (let i = 0; i < 100; i++) {
            let pv = 0;
            for (let t = 1; t <= maturity; t++) {
                pv += monthlyInstallment / Math.pow(1 + r, t);
            }
            if (Math.abs(pv - netAmount) < 0.01) {
                break;
            }
            if (pv > netAmount) {
                low = r;
            } else {
                high = r;
            }
            r = (low + high) / 2;
        }
        return (Math.pow(1 + r, 12) - 1) * 100;
    };

    // June 2026 Live Needs Loan Rates dataset from hangikredi.com (12-Ay 50.000 TL Base)
    const bankData = [
        {
            name: 'Akbank',
            logoText: 'AKB',
            bgGradient: 'linear-gradient(135deg, #be123c, #9f1239)',
            offers: [
                { title: 'Yeni Müşterilere Özel İhtiyaç Kredisi', rate: 0.99, maxAmount: 100000, maxMaturity: 12, isCampaign: true, description: 'Mobilden Akbanklı olanlara özel %0.99 faizli kredi.', source: 'HangiKredi', applyUrl: 'https://www.akbank.com/tr-tr/kampanyalar/Sayfalar/akbankli-ol.aspx' },
                { title: 'Faizsiz Yeni Müşteri Kredisi', rate: 0.00, maxAmount: 70000, maxMaturity: 12, isCampaign: true, description: 'Akbank Mobil\'den yeni müşterilere özel %0 faizli kredi.', source: 'HesapKurdu', applyUrl: 'https://www.akbank.com/tr-tr/kampanyalar/Sayfalar/akbankli-ol.aspx' },
                { title: 'Sigortalı İhtiyaç Kredisi', rate: 4.29, isCampaign: false, description: 'Hayat sigortası korumalı ihtiyaç kredisi teklifi.', source: 'Enuygun Finans', applyUrl: 'https://www.akbank.com/tr-tr/urunler/Sayfalar/ihtiyac-kredisi.aspx' },
                { title: 'Standart İhtiyaç Kredisi', rate: 5.29, isCampaign: false, description: 'Akbank standart ihtiyaç kredisi teklifi.', source: 'Mukayese', applyUrl: 'https://www.akbank.com/tr-tr/urunler/Sayfalar/ihtiyac-kredisi.aspx' }
            ]
        },
        {
            name: 'Albaraka Türk',
            logoText: 'ALB',
            bgGradient: 'linear-gradient(135deg, #b59410, #1e293b)',
            offers: [
                { title: 'Dijital Müşterilere Özel Finansman Kart', rate: 3.95, isCampaign: false, description: 'Albaraka Mobil\'den yeni müşterilere özel finansman kart çözümleri.', source: 'Kredim', applyUrl: 'https://www.albaraka.com.tr/bireysel/finansmanlar/ihtiyac-finansmani' },
                { title: 'Dijital Kampanyalı Kredi', rate: 0.00, maxAmount: 100000, maxMaturity: 6, isCampaign: true, description: 'Faizsiz/kâr paysız dönemsel Albaraka finansman kampanyası.', source: 'Bankalar.org', applyUrl: 'https://www.albaraka.com.tr/bireysel/finansmanlar/ihtiyac-finansmani' }
            ]
        },
        {
            name: 'Alternatif Bank',
            logoText: 'ALB',
            bgGradient: 'linear-gradient(135deg, #0369a1, #075985)',
            offers: [
                { title: 'Dijital İhtiyaç Kredisi', rate: 3.49, isCampaign: false, description: 'Alternatif Bank dijital ihtiyaç kredisi teklifi.', source: 'FinansalKredi', applyUrl: 'https://www.alternatifbank.com.tr/bireysel/krediler/ihtiyac-kredileri' }
            ]
        },
        {
            name: 'Anadolubank',
            logoText: 'ANB',
            bgGradient: 'linear-gradient(135deg, #0369a1, #1e293b)',
            offers: [
                { title: 'Standart İhtiyaç Kredisi', rate: 3.09, isCampaign: false, description: 'Anadolubank şubelerine özel avantajlı ihtiyaç kredisi.', source: 'HangiKredi', applyUrl: 'https://www.anadolubank.com.tr/bireysel/krediler/tuketici-kredisi' }
            ]
        },
        {
            name: 'CEPTETEB',
            logoText: 'TEB',
            bgGradient: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            offers: [
                { title: '3 Ay Ertelemeli Kredi', rate: 4.19, isCampaign: false, description: 'CEPTETEB Mobil üzerinden anında 3 ay ertelemeli ihtiyaç kredisi.', source: 'HesapKurdu', applyUrl: 'https://www.cepteteb.com.tr/cepteteb-ihtiyac-kredisi' }
            ]
        },
        {
            name: 'DenizBank',
            logoText: 'DNZ',
            bgGradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
            offers: [
                { title: 'İhtiyaç Kredisi', rate: 4.31, isCampaign: false, description: 'DenizBank hızlı mobil ihtiyaç kredisi.', source: 'Enuygun Finans', applyUrl: 'https://www.denizbank.com/bireysel/krediler/bireysel-ihtiyac-kredisi' },
                { title: 'Faizsiz Yeni Müşteri Kredisi', rate: 0.00, maxAmount: 100000, maxMaturity: 3, isCampaign: true, description: 'Mobil\'den yeni DenizBanklı olanlara özel %0 faizli kredi.', source: 'Mukayese', applyUrl: 'https://www.denizbank.com/bireysel/krediler/bireysel-ihtiyac-kredisi' }
            ]
        },
        {
            name: 'Dünya Katılım',
            logoText: 'DNK',
            bgGradient: 'linear-gradient(135deg, #0e7490, #164e63)',
            offers: [
                { title: 'Tüketici İhtiyaç Finansmanı', rate: 3.99, isCampaign: false, description: 'Dünya Katılım bankacılığı prensipleriyle tüketici finansmanı.', source: 'Kredim', applyUrl: 'https://dunyakatilim.com.tr/bireysel/finansmanlar' }
            ]
        },
        {
            name: 'Enpara.com',
            logoText: 'ENP',
            bgGradient: 'linear-gradient(135deg, #0284c7, #0f172a)',
            offers: [
                { title: 'Enpara.com İhtiyaç Kredisi', rate: 3.39, isCampaign: false, description: 'Dosya masrafsız, tahsis ücretsiz Enpara ihtiyaç kredisi.', source: 'Bankalar.org', applyUrl: 'https://www.qnbeylesin.enpara.com/krediler/ihtiyac-kredisi' }
            ]
        },
        {
            name: 'Garanti BBVA',
            logoText: 'GAR',
            bgGradient: 'linear-gradient(135deg, #047857, #065f46)',
            offers: [
                { title: 'Faizsiz Taksitli Avans & Kredi', rate: 0.00, maxAmount: 50000, maxMaturity: 3, isCampaign: true, description: '3 ay vadeli 25.000 TL taksitli nakit avans + 3 ay vadeli 25.000 TL kredi.', source: 'FinansalKredi', applyUrl: 'https://www.garantibbva.com.tr/kampanyalar/yeni-musteri-kampanyasi' },
                { title: 'Standart İhtiyaç Kredisi', rate: 4.35, isCampaign: false, description: 'Garanti BBVA standart ihtiyaç kredisi teklifi.', source: 'HangiKredi', applyUrl: 'https://www.garantibbva.com.tr/krediler/ihtiyac-kredisi' }
            ]
        },
        {
            name: 'getirfinans',
            logoText: 'GTR',
            bgGradient: 'linear-gradient(135deg, #5b21b6, #4c1d95)',
            offers: [
                { title: 'İhtiyaç Kredisi', rate: 3.09, isCampaign: false, description: 'Yeni üyelere özel lansman ihtiyaç kredisi.', source: 'HesapKurdu', applyUrl: 'https://www.getirfinans.com' }
            ]
        },
        {
            name: 'Halkbank',
            logoText: 'HLK',
            bgGradient: 'linear-gradient(135deg, #0284c7, #0f172a)',
            offers: [
                { title: 'Hızlı Kredi', rate: 5.25, isCampaign: false, description: 'Halkbank hızlı ve masrafsız tüketici ihtiyaç kredisi.', source: 'Enuygun Finans', applyUrl: 'https://www.halkbank.com.tr/tr/bireysel/krediler/tuketici-kredileri/ihtiyac-kredileri.html' }
            ]
        },
        {
            name: 'HSBC',
            logoText: 'HSB',
            bgGradient: 'linear-gradient(135deg, #be123c, #111827)',
            offers: [
                { title: 'İhtiyaç Kredisi', rate: 5.49, isCampaign: false, description: 'HSBC Advance ve Premier müşterilerine özel ihtiyaç kredisi.', source: 'Mukayese', applyUrl: 'https://www.hsbc.com.tr/krediler/ihtiyac-kredisi' }
            ]
        },
        {
            name: 'ICBC Bank Turkey',
            logoText: 'ICB',
            bgGradient: 'linear-gradient(135deg, #be123c, #be123c)',
            offers: [
                { title: 'Hesaplı Kredi', rate: 3.83, isCampaign: false, description: 'ICBC Bank avantajlı faiz oranlı tüketici kredisi.', source: 'Kredim', applyUrl: 'https://www.icbc.com.tr/tr/bireysel/krediler/ihtiyac-kredisi' }
            ]
        },
        {
            name: 'ING',
            logoText: 'ING',
            bgGradient: 'linear-gradient(135deg, #ea580c, #c2410c)',
            offers: [
                { title: 'ING Yeni Müşterilere Özel', rate: 1.69, maxAmount: 50000, maxMaturity: 6, isCampaign: true, description: '6 ay vadeli 25.000 TL %1.69 faizli kredi + 3 ay vadeli 25.000 TL avans.', source: 'Bankalar.org', applyUrl: 'https://www.ing.com.tr/tr/sizin-icin/kampanyalar/yeni-musteri-kampanyalari' },
                { title: 'Yeni Müşterilere Özel Standart', rate: 3.44, isCampaign: true, description: 'ING Mobil\'den yeni müşterilere özel standart ihtiyaç kredisi.', source: 'FinansalKredi', applyUrl: 'https://www.ing.com.tr/tr/sizin-icin/krediler/ihtiyac-kredisi' },
                { title: 'Kamu Personellerine Özel Kredi', rate: 4.25, isCampaign: false, description: 'Kamu çalışanları ve memurlara özel indirimli ihtiyaç kredisi.', source: 'HangiKredi', applyUrl: 'https://www.ing.com.tr/tr/sizin-icin/krediler/ihtiyac-kredisi' }
            ]
        },
        {
            name: 'İş Bankası',
            logoText: 'İŞB',
            bgGradient: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
            offers: [
                { title: 'Faizsiz Taksitli Nakit Avans', rate: 0.00, maxAmount: 55000, maxMaturity: 3, isCampaign: true, description: '3 ay vadeli 25.000 TL nakit avans + 1 ay vadeli 30.000 TL ek hesap.', source: 'HesapKurdu', applyUrl: 'https://www.isbank.com.tr/kampanyalar/yeni-musteri-kampanyasi' },
                { title: 'Standart İhtiyaç Kredisi', rate: 4.39, isCampaign: false, description: 'İş Bankası standart ihtiyaç kredisi teklifi.', source: 'Enuygun Finans', applyUrl: 'https://www.isbank.com.tr/krediler/ihtiyac-kredisi' }
            ]
        },
        {
            name: 'Kuveyt Türk',
            logoText: 'KVT',
            bgGradient: 'linear-gradient(135deg, #115e59, #0f766e)',
            offers: [
                { title: 'İhtiyaç Kart', rate: 4.11, isCampaign: false, description: 'Masrafsız, tahsis ücretsiz, alışverişe özel İhtiyaç Kart finansmanı.', source: 'Mukayese', applyUrl: 'https://www.kuveytturk.com.tr/bireysel/kartlar/ihtiyac-kart' }
            ]
        },
        {
            name: 'N Kolay (Aktif Bank)',
            logoText: 'NKO',
            bgGradient: 'linear-gradient(135deg, #6d28d9, #5b21b6)',
            offers: [
                { title: 'BES Teminatlı Kredi', rate: 3.59, maxAmount: 250000, maxMaturity: 36, isCampaign: true, description: 'Bireysel Emeklilik Sistemi (BES) teminatlı indirimli ihtiyaç kredisi.', source: 'Kredim', applyUrl: 'https://www.nkolay.com/krediler/ihtiyac-kredisi' },
                { title: 'Standart İhtiyaç Kredisi', rate: 4.19, isCampaign: false, description: 'N Kolay hızlı dijital ihtiyaç kredisi.', source: 'Bankalar.org', applyUrl: 'https://www.nkolay.com/krediler/ihtiyac-kredisi' }
            ]
        },
        {
            name: 'ON Dijital Bankacılık',
            logoText: 'OND',
            bgGradient: 'linear-gradient(135deg, #4d7c0f, #3f6212)',
            offers: [
                { title: 'Avantajlı Dijital İhtiyaç Kredisi', rate: 3.79, isCampaign: false, description: 'ON Mobil\'den yeni ON\'lulara özel 3 ay ertelemeli ihtiyaç kredisi.', source: 'FinansalKredi', applyUrl: 'https://www.on.com.tr/krediler/ihtiyac-kredisi' },
                { title: '3 Ay Ertelemeli Kredi Kampanyası', rate: 3.99, maxAmount: 100000, maxMaturity: 12, isCampaign: true, description: '3 ay ertelemeli ve 15 ay vadeye kadar uzayan ON Kredi.', source: 'HangiKredi', applyUrl: 'https://www.on.com.tr/krediler/ihtiyac-kredisi' }
            ]
        },
        {
            name: 'QNB Finansbank',
            logoText: 'QNB',
            bgGradient: 'linear-gradient(135deg, #0f172a, #1e293b)',
            offers: [
                { title: 'Yeni Müşterilere Özel', rate: 2.49, maxAmount: 100000, maxMaturity: 12, isCampaign: true, description: 'Görüntülü görüşme ile yeni müşterilere özel indirimli ihtiyaç kredisi.', source: 'HesapKurdu', applyUrl: 'https://www.qnbfinansbank.com/krediler/ihtiyac-kredisi' },
                { title: 'Yeni Müşterilere Özel Faizsiz Kredi', rate: 0.00, maxAmount: 50000, maxMaturity: 3, isCampaign: true, description: '3 ay vadeli 25.000 TL taksitli nakit avans + 3 ay vadeli 25.000 TL kredi.', source: 'Enuygun Finans', applyUrl: 'https://www.qnbfinansbank.com/krediler/ihtiyac-kredisi' },
                { title: 'Kredi & Avans Kampanyası', rate: 2.99, maxAmount: 225000, maxMaturity: 24, isCampaign: true, description: 'Yeni müşterilere özel 200.000 TL %2.99 kredi + 25.000 TL %0 nakit avans.', source: 'Mukayese', applyUrl: 'https://www.qnbfinansbank.com/krediler/ihtiyac-kredisi' },
                { title: 'Standart İhtiyaç Kredisi', rate: 3.69, isCampaign: false, description: 'Standart QNB ihtiyaç kredisi teklifi.', source: 'Kredim', applyUrl: 'https://www.qnbfinansbank.com/krediler/ihtiyac-kredisi' }
            ]
        },
        {
            name: 'TEB - Türk Ekonomi Bankası',
            logoText: 'TEB',
            bgGradient: 'linear-gradient(135deg, #166534, #15803d)',
            offers: [
                { title: '3 Ay Ertelemeli Kredi', rate: 4.19, isCampaign: false, description: 'TEB şubeleri ve dijital kanallarında geçerli Hoş Geldin kredisi.', source: 'Bankalar.org', applyUrl: 'https://www.cepteteb.com.tr/cepteteb-ihtiyac-kredisi' },
                { title: 'Faizsiz Taksitli Nakit Avans', rate: 0.00, maxAmount: 25000, maxMaturity: 3, isCampaign: true, description: 'CEPTETEB Mobil\'den yeni müşterilere özel %0 faizli taksitli nakit avans.', source: 'FinansalKredi', applyUrl: 'https://www.cepteteb.com.tr/cepteteb-ihtiyac-kredisi' }
            ]
        },
        {
            name: 'Türkiye Finans',
            logoText: 'TFN',
            bgGradient: 'linear-gradient(135deg, #0891b2, #155e75)',
            offers: [
                { title: '3 Ay Ertelemeli Finansman', rate: 4.09, isCampaign: false, description: 'Masrafsız ve tahsis ücretsiz, 3 ay ertelemeli ihtiyaç finansmanı.', source: 'HangiKredi', applyUrl: 'https://www.turkiyefinans.com.tr/tr-tr/bireysel/finansmanlar/Sayfalar/ihtiyac-finansmani.aspx' }
            ]
        },
        {
            name: 'Vakıf Katılım',
            logoText: 'VKK',
            bgGradient: 'linear-gradient(135deg, #b45309, #7c2d12)',
            offers: [
                { title: 'İhtiyaç Finansmanı', rate: 4.03, isCampaign: false, description: 'Vakıf Katılım kâr paylı ihtiyaç finansmanı desteği.', source: 'HesapKurdu', applyUrl: 'https://www.vakifkatilim.com.tr/bireysel/finansmanlar/ihtiyac-finansmani' }
            ]
        },
        {
            name: 'VakıfBank',
            logoText: 'VAK',
            bgGradient: 'linear-gradient(135deg, #b45309, #78350f)',
            offers: [
                { title: 'İhtiyaç Kredisi', rate: 4.95, isCampaign: false, description: 'Kamu çalışanları ve maaş müşterilerine özel ihtiyaç kredisi.', source: 'Enuygun Finans', applyUrl: 'https://www.vakifbank.com.tr/ihtiyac-kredileri.aspx' }
            ]
        },
        {
            name: 'Yapı Kredi',
            logoText: 'YKR',
            bgGradient: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
            offers: [
                { title: '3 Ay Ertelemeli İhtiyaç Kredisi', rate: 3.89, isCampaign: false, description: 'Yapı Kredi Mobil üzerinden anında 3 ay ertelemeli ihtiyaç kredisi.', source: 'Mukayese', applyUrl: 'https://www.yapikredi.com.tr/bireysel-bankacilik/krediler/bireysel-ihtiyac-kredileri' }
            ]
        },
        {
            name: 'Ziraat Bankası',
            logoText: 'ZRB',
            bgGradient: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            offers: [
                { title: 'Tüketici Kredisi', rate: 4.99, isCampaign: false, description: 'Ziraat Bankası tüketici ürün paketi kapsamında ihtiyaç kredisi.', source: 'Kredim', applyUrl: 'https://www.ziraatbank.com.tr/tr/bireysel/krediler/tuketici-kredisi' }
            ]
        },
        {
            name: 'Ziraat Dinamik',
            logoText: 'ZRD',
            bgGradient: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            offers: [
                { title: 'Ziraat Dinamik Dijital Kampanya', rate: 1.99, maxAmount: 120000, maxMaturity: 12, isCampaign: true, description: 'Yeni müşterilere özel Ziraat Dinamik Mobil aracılığıyla dijital kredi.', source: 'Bankalar.org', applyUrl: 'https://www.ziraatbank.com.tr/tr/bireysel/krediler/tuketici-kredisi' },
                { title: 'Standart İhtiyaç Kredisi', rate: 3.69, isCampaign: false, description: 'Ziraat Dinamik standart ihtiyaç kredisi teklifi.', source: 'FinansalKredi', applyUrl: 'https://www.ziraatbank.com.tr/tr/bireysel/krediler/tuketici-kredisi' }
            ]
        },
        {
            name: 'Ziraat Katılım',
            logoText: 'ZRK',
            bgGradient: 'linear-gradient(135deg, #15803d, #14532d)',
            offers: [
                { title: 'İhtiyaç Finansmanı', rate: 3.99, isCampaign: false, description: 'Ziraat Katılım bireysel ihtiyaç finansmanı çözümü.', source: 'HangiKredi', applyUrl: 'https://www.ziraatkatilim.com.tr/bireysel/finansman/ihtiyac-finansmani' },
                { title: 'Dijital İhtiyaç Katılım', rate: 4.05, isCampaign: false, description: 'Dijital kanallara özel katılım finansmanı teklifi.', source: 'HesapKurdu', applyUrl: 'https://www.ziraatkatilim.com.tr/bireysel/finansman/ihtiyac-finansmani' }
            ]
        }
    ];

    // --- Authentication Flow ---
    let currentUser = window.db.getCurrentUser();
    if (!currentUser) {
        currentUser = { id: 1, name: 'Bireysel - Demo', email: 'bireysel@sri.com', password: '123' };
    }

    function initApp() {
        try {
            if (currentUser) {
                // User is logged in
                authWrapper.classList.add('hidden');
                appWrapper.classList.remove('hidden');
                
                // Set User Info in Sidebar
                sidebarUserName.textContent = currentUser.name;
                userAvatarInitial.textContent = currentUser.name.charAt(0).toUpperCase();

                // Refresh Views with Data
                const defaultViewTarget = 'portfolio-view';
                document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
                document.getElementById(defaultViewTarget).classList.remove('hidden');
                
                refreshPortfolioView();
                refreshDashboard();
                refreshTransactionsList();
                initGPS();
                initDecision();
                initFOMO();
            } else {
                // User is not logged in
                appWrapper.classList.add('hidden');
                authWrapper.classList.remove('hidden');
                showLoginView();
            }
        } catch (e) {
            console.error("Error in initApp:", e);
            alert("Uygulama Başlatma Hatası (initApp):\n" + e.message + "\n\nStack:\n" + e.stack);
        }
    }

    function showLoginView() {
        signupView.classList.remove('active');
        signupView.classList.add('hidden');
        loginView.classList.add('active');
        loginView.classList.remove('hidden');
        loginError.classList.add('hidden');
    }

    function showSignupView() {
        loginView.classList.remove('active');
        loginView.classList.add('hidden');
        signupView.classList.add('active');
        signupView.classList.remove('hidden');
        signupError.classList.add('hidden');
    }

    goToSignup.addEventListener('click', (e) => { e.preventDefault(); showSignupView(); });
    goToLogin.addEventListener('click', (e) => { e.preventDefault(); showLoginView(); });

    loginForm.addEventListener('submit', (e) => {
        try {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            if(window.db.login(email, pass)) {
                currentUser = window.db.getCurrentUser();
                initApp();
                loginForm.reset();
            } else {
                loginError.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Login submit error:", err);
            alert("Giriş Formu Hatası:\n" + err.message + "\n\nStack:\n" + err.stack);
        }
    });

    signupForm.addEventListener('submit', (e) => {
        try {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const pass = document.getElementById('signup-password').value;
            
            const result = window.db.register(name, email, pass);
            if(result.success) {
                currentUser = window.db.getCurrentUser();
                initApp();
                signupForm.reset();
            } else {
                signupError.textContent = result.message;
                signupError.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Signup submit error:", err);
            alert("Kayıt Formu Hatası:\n" + err.message + "\n\nStack:\n" + err.stack);
        }
    });

    logoutBtn.addEventListener('click', () => {
        window.db.logout();
        currentUser = null;
        initApp();
    });

    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;

            // Update Active Nav
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Header Update
            const labelSpan = item.querySelector('span:nth-child(2)') || item.querySelector('span:last-child');
            if (labelSpan) pageTitle.textContent = labelSpan.textContent;

            // View Transition
            views.forEach(v => {
                if(v.id === targetId) {
                    v.classList.remove('hidden');
                    v.classList.add('active');
                    v.style.opacity = '0';
                    v.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        v.style.opacity = '1';
                        v.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    v.classList.add('hidden');
                    v.classList.remove('active');
                }
            });

            // Trigger specific view refresh
            if(targetId === 'dashboard') {
                refreshDashboard();
            } else if (targetId === 'transactions-list') {
                refreshTransactionsList();
            } else if (targetId === 'financial-gps-view') {
                initGPS();
            } else if (targetId === 'ai-decision-view') {
                initDecision();
            } else if (targetId === 'fomo-wall-view') {
                initFOMO();
            } else if (targetId === 'portfolio-view') {
                refreshPortfolioView();
            } else if (targetId === 'bank-offers-view') {
                refreshBankOffers();
            } else if (targetId === 'market-intel-view') {
                refreshMarketIntel();
            } else if (targetId === 'wealth-mgmt-view') {
                refreshWealthMgmt();
            } else if (targetId === 'system-pulse-view') {
                refreshSystemPulse();
            }
        });
    });

    // --- Dashboard Logic ---
    function refreshDashboard() {
        if(!currentUser) return;

        // FILTER DATA BY currentUser.id
        const transactions = window.db.get('transactions').filter(t => t.user_id === currentUser.id);
        const subscriptions = window.db.get('subscriptions').filter(s => s.user_id === currentUser.id);

        let totalIncome = 0;
        let totalExpense = 0;
        
        let categories = {}; // For pie chart
        let categoryDetails = {}; // NEW: For detailed tooltips
        let dates = {}; // For line chart (expenses over time)
        let entertainmentExpense = 0;

        transactions.forEach(t => {
            const amount = convertToTRY(t.amount, t.currency);
            if (t.type === 'income') {
                totalIncome += amount;
            } else if (t.type === 'expense') {
                totalExpense += amount;
                
                // Track Categories
                if(categories[t.category]) {
                    categories[t.category] += amount;
                    categoryDetails[t.category].push({ name: t.category_detail || 'Expense', amount });
                } else {
                    categories[t.category] = amount;
                    categoryDetails[t.category] = [{ name: t.category_detail || 'Expense', amount }];
                }

                if(t.category.toLowerCase().includes('entertainment')) {
                    entertainmentExpense += amount;
                }

                // Track Dates
                const tDate = new Date(t.date);
                const monthKey = `${tDate.getFullYear()}-${tDate.getMonth() + 1}`;
                if(dates[monthKey]) {
                    dates[monthKey] += amount;
                } else {
                    dates[monthKey] = amount;
                }
            }
        });

        // Calculations
        const balance = totalIncome - totalExpense;
        let score = 100;
        if(totalIncome > 0) {
           score = Math.max(0, Math.min(100, 100 - ((totalExpense / totalIncome) * 50)));
        } else if (totalExpense > 0) {
           score = 0;
        }

        const dailyBurnRate = totalExpense / 30; // Assuming 30 days for simplicity
        let remainingDays = 0;
        if(dailyBurnRate > 0) {
            remainingDays = balance / dailyBurnRate;
        } else if (balance > 0) {
            remainingDays = 999;
        }

        const totalSubs = subscriptions.reduce((sum, sub) => sum + convertToTRY(sub.monthly_cost, sub.currency), 0);

        // Update UI
        document.getElementById('val-income').textContent = formatTL(totalIncome);
        document.getElementById('val-expense').textContent = formatTL(totalExpense);
        document.getElementById('val-balance').textContent = formatTL(balance);
        document.getElementById('val-score').textContent = `${Math.round(score)}/100`;
        document.getElementById('val-subs').textContent = formatTL(totalSubs);

        const burnRateDisplay = document.getElementById('val-burn-rate');
        if(remainingDays < 0) {
            burnRateDisplay.textContent = "Deficit (0 days)";
            burnRateDisplay.style.color = "var(--danger)";
        } else if (remainingDays === 999) {
            burnRateDisplay.textContent = "Infinite (No Expenses)";
            burnRateDisplay.style.color = "var(--success)";
        } else {
            burnRateDisplay.textContent = `This spending rate will last ${Math.round(remainingDays)} days`;
            burnRateDisplay.style.color = remainingDays < 15 ? "var(--warning)" : "var(--success)";
        }

        // --- GLOBAL AI RISK BADGE ---
        const headerAiBadge = document.getElementById('header-ai-badge');
        headerAiBadge.classList.remove('hidden');
        if (remainingDays >= 0 && remainingDays < 7) {
            headerAiBadge.innerHTML = 'AI Risk Analysis: HIGH (Confidence 99%)';
            headerAiBadge.style.color = 'var(--danger)';
            headerAiBadge.style.borderColor = 'var(--danger)';
            headerAiBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        } else if (remainingDays >= 7 && remainingDays < 15) {
            headerAiBadge.innerHTML = 'AI Risk Analysis: MED (Confidence 94%)';
            headerAiBadge.style.color = 'var(--warning)';
            headerAiBadge.style.borderColor = 'var(--warning)';
            headerAiBadge.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        } else {
            headerAiBadge.innerHTML = 'AI Risk Analysis: LOW (Confidence 98%)';
            headerAiBadge.style.color = 'var(--success)';
            headerAiBadge.style.borderColor = 'var(--success)';
            headerAiBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        }

        // --- AI Insights Generator ---
        const insightsContainer = document.getElementById('ai-insights-container');
        insightsContainer.innerHTML = ''; 

        const aiRules = [];

        if (totalExpense > totalIncome) {
            aiRules.push({ text: "Spending exceeds income (Deficit detected).", type: 'critical', icon: 'trending_down' });
        }

        // --- NEW: Spending Velocity Check ---
        const currentMonth = new Date().getMonth() + 1;
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const currentYear = new Date().getFullYear();
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const curMonthExp = dates[`${currentYear}-${currentMonth}`] || 0;
        const prevMonthExp = dates[`${prevYear}-${prevMonth}`] || totalExpense / 2; // Fallback for demo

        if (curMonthExp > prevMonthExp * 1.2) {
            aiRules.push({ 
                text: `CRITICAL ALERT: Spending Spike! Monthly velocity increased by ${Math.round((curMonthExp/prevMonthExp - 1)*100)}%.`, 
                type: 'critical', 
                icon: 'notification_important' 
            });
        }

        const entertainmentRatio = totalExpense > 0 ? (entertainmentExpense / totalExpense) : 0;
        if (entertainmentRatio > 0.3) {
            aiRules.push({ text: "Entertainment footprint is above standard benchmarks.", type: 'warning', icon: 'attractions' });
        }

        if (balance > 0 && totalIncome >= totalExpense) {
            aiRules.push({ text: `Mali durumunuz kontrol altındadır`, type: 'success', icon: 'check_circle' });
        }

        // Render rules
        aiRules.forEach(rule => {
            const el = document.createElement('div');
            el.className = `ai-insight ${rule.type}`;
            el.innerHTML = `<span class="material-icons-round">${rule.icon}</span> <span>${rule.text}</span>`;
            insightsContainer.appendChild(el);
        });

        // Render Charts
        renderCharts(categories, dates, balance, totalIncome, totalExpense, categoryDetails);
        renderHeaderGauge(score);
    }

    function renderHeaderGauge(score) {
        const badge = document.getElementById('header-ai-badge');
        const pulseNode = badge ? badge.closest('.pulse-node') : null;
        const canvas = document.getElementById('headerRiskGauge');
        
        if (!badge || !pulseNode || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (headerRiskGaugeInstance) headerRiskGaugeInstance.destroy();

        let statusText = "ACTIVE OVERSIGHT";
        let statusColor = "#10b981";
        
        pulseNode.classList.remove('critical');

        if (score < 30) {
            statusText = "CRITICAL RISK";
            statusColor = "#ef4444";
            pulseNode.classList.add('critical');
        } else if (score < 60) {
            statusText = "MONITORING";
            statusColor = "#f59e0b";
        }

        badge.textContent = statusText;
        badge.style.color = statusColor;

        headerRiskGaugeInstance = safeNewChart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [score, 100 - score],
                    backgroundColor: [statusColor, 'rgba(255,255,255,0.1)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { tooltip: { enabled: false }, legend: { display: false } },
                animation: false
            }
        });
    }

    function renderCharts(categories, dates, currentBalance, totalIncome, totalExpense, categoryDetails) {
        // --- Interactive What-If Variables ---
        const loanStr = document.getElementById('sim-loan') ? document.getElementById('sim-loan').value : '';
        const expStr = document.getElementById('sim-expense') ? document.getElementById('sim-expense').value : '';
        const simLoan = loanStr ? parseFloat(loanStr) : 0;
        const simExp = expStr ? parseFloat(expStr) : 0;

        // --- Manager's Risk Action Center Logic ---
        let insolvencyDateValue = null;
        let riskLevel = 'green'; // green, amber, red

        // --- 180-Day Forecast Chart (Dual-Line + Confidence Intervals) ---
        const forecastLabels = [];
        const baseData = [];
        const simData = [];
        const confidenceHigh = [];
        const confidenceLow = [];
        
        let projectionBal = currentBalance;
        let simProjectionBal = currentBalance + simLoan;
        
        const netDailyChange = ((totalIncome / 30) - (totalExpense / 30)) || 10;
        const simNetDailyChange = netDailyChange - (simExp / 30);
        
        const today = new Date();
        for(let i=0; i<=180; i+=10) {
            const plotDate = new Date(today);
            plotDate.setDate(plotDate.getDate() + i);
            forecastLabels.push(plotDate.toISOString().split('T')[0]);
            
            baseData.push(Math.max(0, projectionBal));
            simData.push(Math.max(0, simProjectionBal));
            
            // Confidence Interval Calculation (Shaded Area)
            const variance = i * (netDailyChange * 0.15); // 15% variance growth over time
            confidenceHigh.push(Math.max(0, projectionBal + variance));
            confidenceLow.push(Math.max(0, projectionBal - variance));
            
            // Check for Insolvency (First time balance hits 0)
            if (projectionBal <= 0 && !insolvencyDateValue) {
                insolvencyDateValue = new Date(plotDate);
            }
            
            projectionBal += (netDailyChange * 10);
            simProjectionBal += (simNetDailyChange * 10);
        }

        // --- Populate Manager Risk Action Center ---
        const actionCenter = document.getElementById('risk-action-center');
        const trafficLight = document.getElementById('traffic-light-indicator');
        const insolvencyLabel = document.getElementById('insolvency-label');
        const summaryText = document.getElementById('risk-summary-text');
        const actionGroup = document.getElementById('pre-emptive-actions');

        if (actionCenter) {
            if (insolvencyDateValue) {
                const daysToInsolvency = Math.ceil((insolvencyDateValue - today) / (1000 * 60 * 60 * 24));
                const monthName = insolvencyDateValue.toLocaleString('default', { month: 'long' });
                
                actionCenter.classList.remove('hidden');
                insolvencyLabel.textContent = `Projected Insolvency: ${monthName}`;
                
                // Determine Risk Level
                actionCenter.classList.remove('red-alert', 'amber-alert');
                trafficLight.classList.remove('red', 'amber');
                actionGroup.innerHTML = '';

                if (daysToInsolvency < 30) {
                    riskLevel = 'red';
                    actionCenter.classList.add('red-alert');
                    trafficLight.classList.add('red');
                    summaryText.textContent = "CRITICAL: High Velocity Debt Spiral Detected.";
                    actionGroup.innerHTML = `<button class="btn-preemptive restructure">Execute Limit Restructuring</button>`;
                } else if (daysToInsolvency < 90) {
                    riskLevel = 'amber';
                    actionCenter.classList.add('amber-alert');
                    trafficLight.classList.add('amber');
                    summaryText.textContent = "WARNING: Negative Momentum. Liquidity Buffer Eroding.";
                    actionGroup.innerHTML = `<button class="btn-preemptive loan-offer">Offer Pre-emptive Consolidation</button>`;
                }
            } else {
                actionCenter.classList.add('hidden');
            }
        }

        // --- Event Delegation for Risk Action Buttons ---
        const actionGroupEl = document.getElementById('pre-emptive-actions');
        if (actionGroupEl && !actionGroupEl.hasAttribute('data-listener')) {
            actionGroupEl.setAttribute('data-listener', 'true');
            actionGroupEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-preemptive');
                if (!btn) return;

                const actionType = btn.classList.contains('restructure') ? 'Limit Restructuring' : 'Pre-emptive Loan Offer';
                const triggerText = document.getElementById('insolvency-label')?.textContent || 'Risk Momentum Detected';
                
                const notes = prompt(`[INSTITUTIONAL AUDIT] Enter manager memo for ${actionType}:`, "Customer contacted; stability plan discussed.");
                
                if (notes !== null) {
                    logIntervention(actionType, triggerText, notes);
                    alert(`${actionType} has been executed and logged successfully.`);
                    btn.disabled = true;
                    btn.textContent = 'EXECUTED';
                    btn.style.opacity = '0.5';
                }
            });
        }

        function logIntervention(type, trigger, notes) {
            const intervention = {
                user_id: currentUser.id,
                timestamp: new Date().toLocaleString('tr-TR'),
                type: type,
                trigger: trigger,
                notes: notes
            };
            window.db.insert('interventions', intervention);
        }


        const forecastCtx = document.getElementById('forecastChart').getContext('2d');
        if(forecastChartInstance) forecastChartInstance.destroy();
        forecastChartInstance = safeNewChart(forecastCtx, {
            type: 'line',
            data: {
                labels: forecastLabels,
                datasets: [
                    {
                        label: 'Projected Base (Actuals)',
                        data: baseData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Confidence Interval',
                        data: confidenceHigh,
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        fill: 2, // Fill down to dataset 2 (Confidence Low)
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Confidence Low',
                        data: confidenceLow,
                        borderColor: 'transparent',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'What-If Simulation',
                        data: simData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 2,
                        pointBackgroundColor: '#f59e0b'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: true, position: 'bottom', labels: { color: '#94a3b8' } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 45 } },
                    y: { border: { display: false }, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });

        // --- Liquidity Gauge (Semi-Circle) ---
        const liquidityRatio = totalExpense > 0 ? (totalIncome / totalExpense).toFixed(1) : '9.9';
        const gaugeCtxContainer = document.getElementById('liquidityGauge');
        if (gaugeCtxContainer) {
            const gaugeCtx = gaugeCtxContainer.getContext('2d');
            if(liquidityGaugeInstance) liquidityGaugeInstance.destroy();
            
            let trackColor = 'rgba(255,255,255,0.05)';
            let fillColor = '#10b981';
            let ratioLabel = document.getElementById('liquidity-ratio-label');
            
            let clampedRatio = parseFloat(liquidityRatio);
            if(clampedRatio < 1) { fillColor = '#ef4444'; }
            else if(clampedRatio < 1.5) { fillColor = '#f59e0b'; }
            
            if(ratioLabel) ratioLabel.textContent = liquidityRatio + 'x';
            if(ratioLabel) ratioLabel.style.color = fillColor;

            let percentage = Math.min((clampedRatio / 3) * 100, 100);

            liquidityGaugeInstance = safeNewChart(gaugeCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [percentage, 100 - percentage],
                        backgroundColor: [fillColor, trackColor],
                        borderWidth: 0,
                        circumference: 180,
                        rotation: 270
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '80%',
                    plugins: { tooltip: { enabled: false }, legend: { display: false } },
                    animation: { animateRotate: true, animateScale: false }
                }
            });
        }

        // --- Risk Score History (Mini Line) ---
        const riskChartContainer = document.getElementById('riskScoreHistory');
        if (riskChartContainer) {
            const riskCtx = riskChartContainer.getContext('2d');
            if(riskScoreHistoryInstance) riskScoreHistoryInstance.destroy();
            
            // Mock historical data trending towards current score (assumed 100 - (expense/income*50))
            let currentScore = totalIncome > 0 ? Math.max(0, Math.min(100, 100 - ((totalExpense / totalIncome) * 50))) : 0;
            const mockRiskData = [currentScore - 15, currentScore - 5, currentScore + 10, currentScore - 2, currentScore];
            
            riskScoreHistoryInstance = safeNewChart(riskCtx, {
                type: 'line',
                data: {
                    labels: ['M-4', 'M-3', 'M-2', 'M-1', 'Now'],
                    datasets: [{
                        data: mockRiskData,
                        borderColor: '#0f2e5a',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.3,
                        pointBackgroundColor: '#0f2e5a'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: true } },
                    scales: {
                        x: { display: true, grid: { display: false } },
                        y: { display: false, min: 0, max: 100 }
                    }
                }
            });
        }

        const sortedDates = Object.keys(dates).sort();
        const lineLabels = sortedDates;
        const lineData = sortedDates.map(d => dates[d]);

        const lineCtx = document.getElementById('lineChart').getContext('2d');
        if(lineChartInstance) lineChartInstance.destroy();
        lineChartInstance = safeNewChart(lineCtx, {
            type: 'line',
            data: {
                labels: lineLabels,
                datasets: [{
                    label: 'Expenses Over Time',
                    data: lineData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ef4444'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { border: { display: false } }
                }
            }
        });

        const pieLabels = Object.keys(categories);
        const pieData = Object.values(categories);
        const pieCtx = document.getElementById('pieChart').getContext('2d');
        if(pieChartInstance) pieChartInstance.destroy();
        
        const colors = ['#0f2e5a', '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']; // Navy scale colors
        pieChartInstance = safeNewChart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, color: '#475569' } },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.raw;
                                let lines = [`${label}: ${formatTL(value)}`];
                                
                                // Mock data for 'Market' if no details found to match prompt
                                if (label.toLowerCase() === 'market') {
                                    lines.push('----------------', `Migros: ${formatTL(250 * 34.0)}`, `Carrefour: ${formatTL(50 * 34.0)}`);
                                } else if (categoryDetails && categoryDetails[label]) {
                                    lines.push('----------------');
                                    categoryDetails[label].slice(0, 3).forEach(detail => {
                                        lines.push(`${detail.name}: ${formatTL(detail.amount)}`);
                                    });
                                }
                                return lines;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Interactive Simulation Listeners ---
    const simLoanInput = document.getElementById('sim-loan');
    const simExpInput = document.getElementById('sim-expense');
    if(simLoanInput) simLoanInput.addEventListener('input', refreshDashboard);
    if(simExpInput) simExpInput.addEventListener('input', refreshDashboard);

    // --- Transactions List Logic ---
    function refreshTransactionsList() {
        if(!currentUser) return;

        const tbody = document.getElementById('transactions-table-body');
        const filterType = document.getElementById('filter-type').value;
        tbody.innerHTML = '';

        // FILTER STATS BY USER
        let transactions = window.db.get('transactions').filter(t => t.user_id === currentUser.id);
        
        let subscriptions = window.db.get('subscriptions').filter(s => s.user_id === currentUser.id).map(s => ({
            id: s.id,
            user_id: s.user_id,
            type: 'subscription',
            amount: s.monthly_cost,
            category: s.name,
            date: s.next_payment_date,
            currency: s.currency
        }));

        let combined = [...transactions, ...subscriptions];

        if(filterType !== 'all') {
            combined = combined.filter(t => t.type === filterType);
        }

        combined.sort((a,b) => new Date(b.date) - new Date(a.date));

        combined.forEach(t => {
            const tr = document.createElement('tr');
            
            let typeBadgeText = t.type;
            let badgeClass = t.type;
            if (t.type === 'subscription') {
                typeBadgeText = 'Abonelik';
                badgeClass = 'expense';
            } else if (t.type === 'income') {
                typeBadgeText = 'Gelir';
            } else if (t.type === 'expense') {
                typeBadgeText = 'Gider';
            }

            const amountColor = t.type === 'income' ? 'var(--success)' : 'var(--danger)';
            const amountPrefix = t.type === 'income' ? '+' : '-';

            tr.innerHTML = `
                <td>${t.date}</td>
                <td style="font-weight: 500;">${t.category}</td>
                <td><span class="badge ${badgeClass}">${typeBadgeText}</span></td>
                <td style="color: ${amountColor}; font-weight: 600;">
                    ${amountPrefix}${formatTransactionAmount(t.amount, t.currency)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('filter-type').addEventListener('change', refreshTransactionsList);


    function refreshPortfolioView() {
        const users = window.db.get('users');
        const transactions = window.db.get('transactions');
        const debts = window.db.get('debts');
        
        let totalAssets = 0;
        let highRiskCount = 0;
        let totalScore = 0;

        const tbody = document.getElementById('portfolio-table-body');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => {
            const userTx = transactions.filter(t => t.user_id === user.id);
            const userIncome = userTx.filter(t => t.type === 'income').reduce((sum, t) => sum + convertToUSD(t.amount, t.currency), 0);
            const userExpense = userTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + convertToUSD(t.amount, t.currency), 0);
            const balance = userIncome - userExpense;
            
            const userDebt = debts.find(d => d.user_id === user.id);
            const monthlyDebt = userDebt ? userDebt.monthly_payment : 0;
            
            // Score & Grade (Repeated logic for portfolio summary)
            const score = userIncome > 0 ? Math.max(0, Math.min(100, 100 - (((userExpense + (monthlyDebt * 2)) / userIncome) * 50))) : 0;
            
            let grade = 'F';
            let gradeClass = 'grade-f';
            if(score > 90) { grade = 'A+'; gradeClass = 'grade-aplus'; }
            else if(score > 80) { grade = 'A'; gradeClass = 'grade-a'; }
            else if(score > 60) { grade = 'B'; gradeClass = 'grade-b'; }
            else if(score > 40) { grade = 'C'; gradeClass = 'grade-c'; }
            else if(score > 20) { grade = 'D'; gradeClass = 'grade-d'; }

            if (score < 40) highRiskCount++;
            totalAssets += balance;
            totalScore += score;

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">${user.name.charAt(0)}</div>
                            <span style="font-weight: 700;">${user.name}</span>
                        </div>
                    </td>
                    <td>${user.id === 2 ? 'SME' : (user.id === 3 ? 'Institutional' : 'Retail')}</td>
                    <td><span class="resilience-badge ${gradeClass}">${grade}</span></td>
                    <td style="font-weight: 800; color: ${score < 40 ? 'var(--danger)' : 'var(--text-main)'}">${score.toFixed(1)}</td>
                    <td>
                        <button class="btn-drilldown" onclick="window.switchCustomerContext(${user.id})">Detaylara Git</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Update Macro Stats
        if(document.getElementById('port-total-assets')) document.getElementById('port-total-assets').textContent = formatCurrency(totalAssets);
        if(document.getElementById('port-high-risk')) document.getElementById('port-high-risk').textContent = highRiskCount;
        if(document.getElementById('port-avg-grade')) {
            const avgScore = totalScore / users.length;
            let avgGrade = 'B-';
            if(avgScore > 80) avgGrade = 'A';
            else if(avgScore > 60) avgGrade = 'B';
            else if(avgScore > 40) avgGrade = 'C';
            document.getElementById('port-avg-grade').textContent = avgGrade;
        }
    }

    window.switchCustomerContext = (userId) => {
        const users = window.db.get('users');
        const targetUser = users.find(u => u.id === userId);
        if (targetUser) {
            currentUser = targetUser;
            localStorage.setItem('smartfinance_session', userId.toString());
            
            // UI Update
            sidebarUserName.textContent = currentUser.name;
            userAvatarInitial.textContent = currentUser.name.charAt(0).toUpperCase();

            // Switch to Dashboard View
            document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
            document.getElementById('dashboard').classList.remove('hidden');
            
            // Set nav active state
            document.querySelectorAll('.nav-item').forEach(btn => {
                btn.classList.remove('active');
                if(btn.dataset.target === 'dashboard') btn.classList.add('active');
            });

            // Refresh dashboards for the new user
            refreshDashboard();
            refreshTransactionsList();
            
            // Proactive notify
            console.log(`[SRI CONTEXT SWITCH] Active Customer: ${currentUser.name}`);
        }
    };

    function syncHeaderRiskStatus(score) {
        const badge = document.getElementById('header-ai-badge');
        const pulseNode = badge ? badge.closest('.pulse-node') : null;
        const canvas = document.getElementById('headerRiskGauge');
        
        if (!badge || !pulseNode || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (headerRiskGaugeInstance) headerRiskGaugeInstance.destroy();

        let statusText = "SECURE";
        let statusColor = "#10b981";
        
        pulseNode.classList.remove('critical');

        if (score < 30) {
            statusText = "CRITICAL RISK";
            statusColor = "#ef4444";
            pulseNode.classList.add('critical');
        } else if (score < 60) {
            statusText = "MONITORING";
            statusColor = "#f59e0b";
        }

        badge.textContent = statusText;
        badge.style.color = statusColor;

        headerRiskGaugeInstance = safeNewChart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [score, 100 - score],
                    backgroundColor: [statusColor, 'rgba(255,255,255,0.1)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { tooltip: { enabled: false }, legend: { display: false } },
                animation: false
            }
        });
    }

    function refreshBankOffers() {
        const transactions = window.db.get('transactions').filter(t => t.user_id === currentUser.id);
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + convertToUSD(t.amount, t.currency), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + convertToUSD(t.amount, t.currency), 0);
        
        let score = 100;
        if(totalIncome > 0) score = Math.max(0, Math.min(100, 100 - ((totalExpense / totalIncome) * 50)));

        const offerHero = document.getElementById('bank-recommendation-hero');
        const title = document.getElementById('rec-bank-title');
        const reason = document.getElementById('rec-bank-reason');
        const tableBody = document.getElementById('bank-rates-table');

        // Calculator inputs
        const amountSlider = document.getElementById('calc-amount-slider');
        const maturitySelect = document.getElementById('calc-maturity-select');
        const bankSelect = document.getElementById('calc-bank-select');
        
        let amount = amountSlider ? parseFloat(amountSlider.value) : 50000;
        let maturity = maturitySelect ? parseInt(maturitySelect.value) : 12;
        let selectedBank = bankSelect ? bankSelect.value : 'all';

        // Helper: Calculate single offer details
        function calculateSingleOffer(bank, offer) {
            let adjustedRate = offer.rate;
            let isCampaign = offer.isCampaign === true;
            let isValidCampaign = true;
            let productTitle = offer.title;
            let descText = offer.description;
            let isLimitExceeded = false;

            if (isCampaign) {
                // Check if limits exceeded
                const amountLimit = offer.maxAmount !== undefined ? amount > offer.maxAmount : false;
                const maturityLimit = offer.maxMaturity !== undefined ? maturity > offer.maxMaturity : false;
                
                if (amountLimit || maturityLimit) {
                    isValidCampaign = false;
                    isLimitExceeded = true;
                    // Find bank's cheapest standard offer for fallback
                    const standardOffers = bank.offers.filter(o => !o.isCampaign);
                    let baseRate = 4.5;
                    if (standardOffers.length > 0) {
                        baseRate = Math.min(...standardOffers.map(o => o.rate));
                    }
                    // Apply score adjustments on standard rate
                    adjustedRate = baseRate;
                    if (score > 85) {
                        adjustedRate = Math.max(1.50, baseRate - 0.25);
                    } else if (score < 40) {
                        adjustedRate = baseRate + 0.50;
                    }
                    productTitle = `${offer.title} (Limit Dışı)`;
                    descText = `Kampanya sınırları aşıldığı için standart oran uygulandı. (Maks. ${offer.maxAmount ? formatTL(offer.maxAmount).replace(',00','') : ''} TL, ${offer.maxMaturity || ''} Ay)`;
                }
            } else {
                // Standard offer: apply score adjustments
                if (score > 85) {
                    adjustedRate = Math.max(1.50, offer.rate - 0.25);
                    descText = `Yüksek mali puanınız nedeniyle faiz indirimi uygulandı. (${offer.description})`;
                } else if (score < 40) {
                    adjustedRate = offer.rate + 0.50;
                    descText = `Düşük mali puan nedeniyle risk primi yansıtıldı. (${offer.description})`;
                }
            }

            // Loan math formula
            let monthlyInstallment = 0;
            let totalRepayment = 0;
            let allocationFee = 0;
            let annualCostRate = 0;

            if (adjustedRate === 0) {
                monthlyInstallment = amount / maturity;
                totalRepayment = amount;
                allocationFee = 0;
                annualCostRate = 0;
            } else {
                const monthlyRateWithTax = (adjustedRate / 100) * 1.30; // 15% BSMV + 15% KKDF
                monthlyInstallment = amount * (monthlyRateWithTax * Math.pow(1 + monthlyRateWithTax, maturity)) / (Math.pow(1 + monthlyRateWithTax, maturity) - 1);
                totalRepayment = monthlyInstallment * maturity;
                
                // Allocation fee: Katılım banks (Ziraat Katılım, Vakıf Katılım, Albaraka Türk, Kuveyt Türk, Türkiye Finans, Dünya Katılım) and Enpara are 0.
                const isZeroFeeBank = [
                    'Ziraat Katılım', 'Vakıf Katılım', 'Albaraka Türk', 'Kuveyt Türk', 'Türkiye Finans', 'Dünya Katılım', 'Enpara.com'
                ].includes(bank.name);

                if (isZeroFeeBank) {
                    allocationFee = 0;
                } else {
                    allocationFee = amount * 0.00575; // 0.5% + 15% BSMV
                }

                annualCostRate = calculateAnnualCostRate(amount, maturity, monthlyInstallment, allocationFee);
            }

            // Determine status badge
            let statusText = 'UYGUN';
            let statusClass = 'grade-a';
            
            if (isCampaign) {
                if (isValidCampaign) {
                    statusText = 'KAMPANYA';
                    statusClass = 'grade-aplus';
                } else {
                    statusText = 'LİMİT DIŞI';
                    statusClass = 'grade-b';
                }
            } else {
                statusText = adjustedRate < 3.5 ? 'AVANTAJLI' : 'UYGUN';
                statusClass = adjustedRate < 3.5 ? 'grade-a' : 'grade-b';
            }

             return {
                bankName: bank.name,
                logoText: bank.logoText,
                bgGradient: bank.bgGradient,
                productTitle: productTitle,
                monthlyRate: adjustedRate,
                monthlyInstallment: monthlyInstallment,
                totalRepayment: totalRepayment + allocationFee,
                allocationFee: allocationFee,
                isCampaign: isCampaign && isValidCampaign,
                isLimitExceeded: isLimitExceeded,
                description: descText,
                annualCostRate: annualCostRate,
                statusText: statusText,
                statusClass: statusClass,
                source: offer.source || 'HangiKredi',
                applyUrl: offer.applyUrl || 'https://www.hangikredi.com'
            };
        }

        const sourceSelect = document.getElementById('calc-source-select');
        let selectedSource = sourceSelect ? sourceSelect.value : 'all';

        // Helper: Find best offer for a bank (cheapest valid) from a specific source
        function getBestOfferForBank(bank, sourceFilter) {
            let offers = bank.offers;
            if (sourceFilter !== 'all') {
                offers = offers.filter(o => o.source === sourceFilter);
            }
            if (offers.length === 0) return null;

            const calculatedOffers = offers.map(o => calculateSingleOffer(bank, o));
            calculatedOffers.sort((a, b) => {
                if (a.isLimitExceeded !== b.isLimitExceeded) {
                    return a.isLimitExceeded ? 1 : -1;
                }
                return a.totalRepayment - b.totalRepayment;
            });
            return calculatedOffers[0];
        }

        // Determine list of offers to display
        let displayedOffers = [];
        if (selectedBank === 'all') {
            displayedOffers = bankData
                .map(b => getBestOfferForBank(b, selectedSource))
                .filter(o => o !== null);
            // Sort banks alphabetically by bankName
            displayedOffers.sort((a, b) => a.bankName.localeCompare(b.bankName, 'tr'));
        } else {
            const targetBank = bankData.find(b => b.name === selectedBank);
            if (targetBank) {
                let offers = targetBank.offers;
                if (selectedSource !== 'all') {
                    offers = offers.filter(o => o.source === selectedSource);
                }
                displayedOffers = offers.map(o => calculateSingleOffer(targetBank, o));
                displayedOffers.sort((a, b) => a.totalRepayment - b.totalRepayment);
            }
        }

        // Update Recommendation Hero based on best match in the displayed list
        if (displayedOffers.length > 0) {
            const validOffers = displayedOffers.filter(o => !o.isLimitExceeded);
            const best = validOffers.length > 0 ? validOffers[0] : displayedOffers[0];
            
            title.textContent = `En İyi Eşleşme: ${best.bankName} (Yıllık Maliyet: ${best.annualCostRate === 0 ? '%0,00' : `%${best.annualCostRate.toFixed(2)}`})`;
            
            let bestReason = "";
            if (score < 40) {
                bestReason = `Düşük Mali Puanınız (%${Math.round(score)}) nedeniyle standart faiz oranlarına risk primi (+%0,50) eklenmiştir. Bu durumda bile en düşük maliyeti ${best.bankName} sunmaktadır. (Yıllık Maliyet Oranı: %${best.annualCostRate.toFixed(2)})`;
            } else if (best.isCampaign) {
                bestReason = `Yeni müşterilere özel sunulan faizsiz/indirimli kampanya kapsamında ${best.bankName} en uygun seçenek olarak öne çıkıyor. (${best.description})`;
            } else {
                bestReason = `Güçlü Mali Puanınız (%${Math.round(score)}) sayesinde faiz indirimi uygulandı. ${best.bankName} şu anda en avantajlı geri ödeme planını sunuyor. (Yıllık Maliyet Oranı: %${best.annualCostRate.toFixed(2)})`;
            }
            
            reason.textContent = bestReason;
            offerHero.style.borderTopColor = score > 60 ? 'var(--brand-primary)' : 'var(--danger)';

            const applyBtn = document.getElementById('rec-bank-apply-btn');
            if (applyBtn) {
                applyBtn.onclick = () => {
                    alert(`Başvuru Talebi Alındı!\n\nSeçilen Banka: ${best.bankName}\nKredi Ürünü: ${best.productTitle}\nPlatform: ${best.source}\nTutar: ${formatTL(amount)}\nVade: ${maturity} Ay\nAylık Taksit: ${formatTL(best.monthlyInstallment)}\n\nKredi başvuru ve kampanya resmi sayfasına yönlendiriliyorsunuz.`);
                    window.open(best.applyUrl, '_blank');
                };
            }
        }

        // Render Matrix Table
        tableBody.innerHTML = displayedOffers.map(l => {
            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="bank-logo-sm" style="background: ${l.bgGradient}; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.9rem; color: #fff;">
                                ${l.logoText}
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <strong style="color: var(--text-main); font-size: 0.9rem;">${l.bankName}</strong>
                                <span style="font-size: 0.7rem; color: var(--text-muted);">${l.description}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge info" style="font-size: 0.75rem; background: rgba(3, 105, 161, 0.1); color: #38bdf8; border: 1px solid rgba(3, 105, 161, 0.2); border-radius: 6px; padding: 4px 8px; font-weight: 700;">
                            ${l.source}
                        </span>
                    </td>
                    <td>
                        <span style="font-size: 0.85rem; font-weight: 600;">${l.productTitle}</span>
                    </td>
                    <td class="rate-value" style="font-size: 1rem; font-weight: 800;">
                        ${l.monthlyRate === 0 ? '%0,00 (Faizsiz)' : `%${l.monthlyRate.toFixed(2)}`}
                    </td>
                    <td style="font-size: 0.95rem; font-weight: 700; color: var(--warning);">
                        ${l.annualCostRate === 0 ? '%0,00' : `%${l.annualCostRate.toFixed(2)}`}
                    </td>
                    <td style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">
                        ${formatTL(l.monthlyInstallment)}
                    </td>
                    <td style="font-weight: 800; font-size: 0.95rem; color: var(--brand-primary);">
                        ${formatTL(l.totalRepayment)}
                        ${l.allocationFee > 0 ? `<div style="font-size: 0.65rem; color: var(--text-muted); font-weight: normal;">(Tahsis Ücreti Dahil)</div>` : ''}
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="resilience-badge ${l.statusClass}">${l.statusText}</span>
                            <button class="btn-drilldown" style="padding: 6px 12px; font-size: 0.7rem;" onclick="window.applyForLoan('${l.bankName}', '${l.productTitle}', ${amount}, ${maturity}, ${l.monthlyInstallment}, '${l.applyUrl}')">Başvur</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        renderSeasonalCampaigns('all');
    }

    function refreshMarketIntel() {
        const container = document.getElementById('investment-content-container');
        const adviceText = document.getElementById('hedge-advice-text');
        const hedgeCard = document.getElementById('hedge-recommendation-card');
        
        if (!container) return;

        // Cleanup old sparklines (if any)
        if(marketSparklines) {
            marketSparklines.forEach(s => s.destroy());
            marketSparklines = [];
        }

        // Active Tab Category
        const activeTab = document.querySelector('.invest-tab-btn.active');
        const activeCategory = activeTab ? activeTab.getAttribute('data-category') : 'all';

        // Rates dataset (June 2026 HangiKredi Yatırım Araçları live data)
        const currencyData = [
            { name: 'Dolar', code: 'USD', last: 45.9273, bid: 45.9208, ask: 45.9339, trend: '+0.06%', up: true },
            { name: 'Euro', code: 'EUR', last: 53.5154, bid: 53.5102, ask: 53.5208, trend: '+0.16%', up: true },
            { name: 'Sterlin', code: 'GBP', last: 61.9198, bid: 61.9138, ask: 61.9259, trend: '+0.17%', up: true }
        ];

        const goldData = [
            { name: 'Gram Altın', code: 'Gram Altın', last: 6657.911, bid: 6656.965, ask: 6657.911, trend: '+0.58%', up: true },
            { name: 'Çeyrek Altın', code: 'Çeyrek', last: 10902.06, bid: 10668.68, ask: 10902.06, trend: '+1.49%', up: true },
            { name: 'Yarım Altın', code: 'Yarım', last: 21804.12, bid: 21270.69, ask: 21804.12, trend: '+1.49%', up: true },
            { name: 'Cumhuriyet Altını', code: 'Cumhuriyet', last: 43608.24, bid: 42500.00, ask: 43608.24, trend: '+1.49%', up: true },
            { name: 'Ons Altın', code: 'ONS', last: 3075.00, bid: 3074.50, ask: 3075.50, trend: '+0.15%', up: true } // in USD
        ];

        const stockData = [
            { name: 'BIST 100', code: 'XU100', last: 14128.25, trend: '+3.10%', up: true },
            { name: 'BIST 30', code: 'XU030', last: 16051.88, trend: '+3.09%', up: true }
        ];

        const singleStocks = [
            { name: 'KARTONSAN', code: 'KARTN', last: 124.30, trend: '+10.00%', up: true },
            { name: 'ESCAR FİLO', code: 'ESCAR', last: 52.80, trend: '+10.00%', up: true },
            { name: 'EUROPOWER ENERJİ', code: 'EUPWR', last: 82.05, trend: '+9.99%', up: true },
            { name: 'GİMAT MAĞAZACILIK', code: 'GMTAS', last: 49.06, trend: '+10.00%', up: true },
            { name: 'METRO PETROL', code: 'MEPET', last: 25.10, trend: '+9.99%', up: true },
            { name: 'KONFRUT TARIM', code: 'KNFRT', last: 14.63, trend: '+10.00%', up: true }
        ];

        const depositData = [
            { bankName: 'ON Dijital Bankacılık', logoText: 'OND', bgGradient: 'linear-gradient(135deg, #4d7c0f, #3f6212)', rate: 54.00 },
            { bankName: 'Alternatif Bank', logoText: 'ALB', bgGradient: 'linear-gradient(135deg, #0369a1, #075985)', rate: 53.00 },
            { bankName: 'Fibabanka', logoText: 'FIB', bgGradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)', rate: 52.00 },
            { bankName: 'Odeabank', logoText: 'ODE', bgGradient: 'linear-gradient(135deg, #ea580c, #c2410c)', rate: 52.00 },
            { bankName: 'QNB Finansbank', logoText: 'QNB', bgGradient: 'linear-gradient(135deg, #0f172a, #1e293b)', rate: 48.00 },
            { bankName: 'Akbank', logoText: 'AKB', bgGradient: 'linear-gradient(135deg, #be123c, #9f1239)', rate: 47.00 },
            { bankName: 'DenizBank', logoText: 'DNZ', bgGradient: 'linear-gradient(135deg, #0284c7, #0369a1)', rate: 46.00 },
            { bankName: 'Garanti BBVA', logoText: 'GAR', bgGradient: 'linear-gradient(135deg, #047857, #065f46)', rate: 45.00 },
            { bankName: 'İş Bankası', logoText: 'İŞB', bgGradient: 'linear-gradient(135deg, #1d4ed8, #1e40af)', rate: 43.00 },
            { bankName: 'Yapı Kredi', logoText: 'YKR', bgGradient: 'linear-gradient(135deg, #1e3a8a, #1e40af)', rate: 42.00 }
        ];

        // Format helper
        const fmtVal = (v, isCurrency = true) => {
            return isCurrency 
                ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(v)
                : new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(v);
        };

        if (activeCategory === 'all') {
            container.innerHTML = `
                <div class="market-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px;">
                    <!-- USD Card -->
                    <div class="index-card">
                        <div class="index-header">
                            <span class="index-name">ABD Doları (USD)</span>
                            <span class="trend-badge trend-up">${currencyData[0].trend}</span>
                        </div>
                        <div class="index-value">${fmtVal(currencyData[0].last)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Alış: ${fmtVal(currencyData[0].bid)} | Satış: ${fmtVal(currencyData[0].ask)}</div>
                    </div>
                    <!-- EUR Card -->
                    <div class="index-card">
                        <div class="index-header">
                            <span class="index-name">Euro (EUR)</span>
                            <span class="trend-badge trend-up">${currencyData[1].trend}</span>
                        </div>
                        <div class="index-value">${fmtVal(currencyData[1].last)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Alış: ${fmtVal(currencyData[1].bid)} | Satış: ${fmtVal(currencyData[1].ask)}</div>
                    </div>
                    <!-- Gold Card -->
                    <div class="index-card">
                        <div class="index-header">
                            <span class="index-name">Gram Altın</span>
                            <span class="trend-badge trend-up">${goldData[0].trend}</span>
                        </div>
                        <div class="index-value">${fmtVal(goldData[0].last)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Alış: ${fmtVal(goldData[0].bid)} | Satış: ${fmtVal(goldData[0].ask)}</div>
                    </div>
                    <!-- BIST Card -->
                    <div class="index-card pulse-anim">
                        <div class="index-header">
                            <span class="index-name">BIST 100</span>
                            <span class="trend-badge trend-up">${stockData[0].trend}</span>
                        </div>
                        <div class="index-value">${fmtVal(stockData[0].last, false)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Günün Canlı Seviyesi</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <div class="card" style="padding: 24px;">
                        <h3 style="color: var(--brand-primary); margin-bottom: 15px; font-weight: 700;">En Yüksek Mevduat Oranı</h3>
                        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div class="bank-logo-sm" style="background: ${depositData[0].bgGradient}; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff;">
                                    ${depositData[0].logoText}
                                </div>
                                <strong>${depositData[0].bankName}</strong>
                            </div>
                            <span style="font-size: 1.5rem; font-weight: 900; color: var(--success);">%${depositData[0].rate.toFixed(2)}</span>
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 15px;">Mevduat sekmesinden anaparanızı girerek tüm bankaların getiri karşılaştırmalarını simüle edebilirsiniz.</p>
                    </div>

                    <div class="card" style="padding: 24px;">
                        <h3 style="color: var(--brand-primary); margin-bottom: 15px; font-weight: 700;">Günün En Çok Yükselen Hissesi</h3>
                        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                            <div>
                                <strong>${singleStocks[0].name} (${singleStocks[0].code})</strong>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">BIST Tarım & Gıda</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.25rem; font-weight: 800; color: #fff;">${fmtVal(singleStocks[0].last)}</div>
                                <span class="trend-badge trend-up" style="display: inline-block; margin-top: 2px;">${singleStocks[0].trend}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } 
        else if (activeCategory === 'doviz') {
            container.innerHTML = `
                <div class="market-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px;">
                    ${currencyData.map(c => `
                        <div class="index-card">
                            <div class="index-header">
                                <span class="index-name">${c.name} (${c.code})</span>
                                <span class="trend-badge trend-up">${c.trend}</span>
                            </div>
                            <div class="index-value" style="font-size: 1.75rem; font-weight: 900; color: #fff; margin: 10px 0;">${fmtVal(c.last)}</div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-top: 8px;">
                                <span>Alış: ${fmtVal(c.bid)}</span>
                                <span>Satış: ${fmtVal(c.ask)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Currency Converter -->
                <div class="card" style="padding: 24px;">
                    <h3 style="color: var(--brand-primary); margin-bottom: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons-round">sync_alt</span>
                        İnteraktif Döviz Çevirici
                    </h3>
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; align-items: flex-end;">
                        <div class="calc-input-group" style="margin:0;">
                            <label style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">Miktar</label>
                            <input type="number" id="conv-amount" value="1000" class="calc-text-input" style="background: rgba(255,255,255,0.03);">
                        </div>
                        <div class="calc-input-group" style="margin:0;">
                            <label style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">Kaynak Para Birimi</label>
                            <select id="conv-source" class="calc-select" style="background: rgba(255,255,255,0.03); padding: 12px;">
                                <option value="USD">Dolar (USD)</option>
                                <option value="EUR">Euro (EUR)</option>
                                <option value="GBP">Sterlin (GBP)</option>
                                <option value="TRY">Türk Lirası (TRY)</option>
                            </select>
                        </div>
                        <div class="calc-input-group" style="margin:0;">
                            <label style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">Hedef Para Birimi</label>
                            <select id="conv-target" class="calc-select" style="background: rgba(255,255,255,0.03); padding: 12px;">
                                <option value="TRY" selected>Türk Lirası (TRY)</option>
                                <option value="USD">Dolar (USD)</option>
                                <option value="EUR">Euro (EUR)</option>
                                <option value="GBP">Sterlin (GBP)</option>
                            </select>
                        </div>
                    </div>
                    <div id="conv-result-display" style="margin-top: 24px; font-size: 1.5rem; font-weight: 900; color: var(--brand-primary); text-align: center; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px dashed var(--border-color); letter-spacing: 0.5px;">
                        1.000,00 USD = 45.928,40 TRY
                    </div>
                </div>
            `;

            const convAmount = document.getElementById('conv-amount');
            const convSource = document.getElementById('conv-source');
            const convTarget = document.getElementById('conv-target');
            const convResult = document.getElementById('conv-result-display');

            const rates = { USD: 45.9284, EUR: 53.5264, GBP: 61.9332, TRY: 1.0 };
            const names = { USD: 'USD', EUR: 'EUR', GBP: 'GBP', TRY: 'TRY' };

            function calculateConversion() {
                let amt = parseFloat(convAmount.value) || 0;
                let src = convSource.value;
                let tgt = convTarget.value;
                
                let converted = amt * rates[src] / rates[tgt];
                
                let srcFormatted = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(amt);
                let tgtFormatted = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(converted);
                
                convResult.textContent = `${srcFormatted} ${names[src]} = ${tgtFormatted} ${names[tgt]}`;
            }

            if (convAmount && convSource && convTarget) {
                convAmount.addEventListener('input', calculateConversion);
                convSource.addEventListener('change', calculateConversion);
                convTarget.addEventListener('change', calculateConversion);
            }
        } 
        else if (activeCategory === 'altin') {
            container.innerHTML = `
                <div class="market-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; margin-bottom: 24px;">
                    ${goldData.map(g => {
                        let valText = g.code === 'ONS' 
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(g.last)
                            : fmtVal(g.last);
                        let bidText = g.code === 'ONS'
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(g.bid)
                            : fmtVal(g.bid);
                        let askText = g.code === 'ONS'
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(g.ask)
                            : fmtVal(g.ask);
                            
                        return `
                            <div class="index-card">
                                <div class="index-header">
                                    <span class="index-name">${g.name}</span>
                                    <span class="trend-badge trend-up">${g.trend}</span>
                                </div>
                                <div class="index-value" style="font-size: 1.6rem; font-weight: 900; color: #fff; margin: 10px 0;">${valText}</div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-top: 8px;">
                                    <span>Alış: ${bidText}</span>
                                    <span>Satış: ${askText}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } 
        else if (activeCategory === 'mevduat') {
            container.innerHTML = `
                <!-- Dynamic Yield Calculator Card -->
                <div class="card" style="padding: 24px; margin-bottom: 24px;">
                    <h3 style="color: var(--brand-primary); margin-bottom: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons-round">calculate</span>
                        Vadeli Mevduat Getiri Hesaplayıcı
                    </h3>
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                        <div class="calc-input-group" style="margin:0;">
                            <label style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">Yatırılacak Anapara Tutarı</label>
                            <input type="number" id="mev-amount" value="100000" min="1000" step="5000" class="calc-text-input" style="background: rgba(255,255,255,0.03);">
                        </div>
                        <div class="calc-input-group" style="margin:0;">
                            <label style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">Vade Süresi (Gün)</label>
                            <select id="mev-maturity" class="calc-select" style="background: rgba(255,255,255,0.03); padding: 12px;">
                                <option value="32" selected>32 Gün (Standart)</option>
                                <option value="45">45 Gün</option>
                                <option value="92">92 Gün</option>
                                <option value="180">180 Gün</option>
                                <option value="365">365 Gün</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Rates Table -->
                <div class="card table-card">
                    <div class="table-header">
                        <h2>Vadeli Mevduat Faiz Oranları (HangiKredi Canlı Verileri)</h2>
                        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top:4px;">Yukarıda girilen tutar ve vadeye göre net faiz kazançları (%7.5 stopaj kesintisi düşülmüştür).</p>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Banka</th>
                                    <th>Faiz Oranı</th>
                                    <th>Brüt Faiz Getirisi</th>
                                    <th>Stopaj Vergisi (%7.5)</th>
                                    <th>Net Faiz Getirisi</th>
                                    <th>Vade Sonu Toplam Tutar</th>
                                </tr>
                            </thead>
                            <tbody id="mevduat-rates-tbody">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            const mevAmountInput = document.getElementById('mev-amount');
            const mevMaturitySelect = document.getElementById('mev-maturity');
            const mevTbody = document.getElementById('mevduat-rates-tbody');

            function refreshMevduatTable() {
                if (!mevTbody) return;
                
                let capital = parseFloat(mevAmountInput.value) || 100000;
                let days = parseInt(mevMaturitySelect.value) || 32;
                
                mevTbody.innerHTML = depositData.map(bank => {
                    let gross = capital * (bank.rate / 100) * (days / 365);
                    let stopaj = gross * 0.075;
                    let net = gross - stopaj;
                    let total = capital + net;
                    
                    return `
                        <tr>
                            <td>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div class="bank-logo-sm" style="background: ${bank.bgGradient}; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.8rem; color: #fff;">
                                        ${bank.logoText}
                                    </div>
                                    <strong style="color: var(--text-main); font-size: 0.85rem;">${bank.bankName}</strong>
                                </div>
                            </td>
                            <td style="font-weight: 800; font-size: 1rem; color: var(--success);">
                                %${bank.rate.toFixed(2)}
                            </td>
                            <td style="font-size: 0.9rem; color: var(--text-muted);">
                                ${fmtVal(gross)}
                            </td>
                            <td style="font-size: 0.9rem; color: var(--danger);">
                                ${fmtVal(stopaj)}
                            </td>
                            <td style="font-weight: 700; font-size: 0.95rem; color: var(--success);">
                                ${fmtVal(net)}
                            </td>
                            <td style="font-weight: 800; font-size: 0.95rem; color: var(--brand-primary);">
                                ${fmtVal(total)}
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            if (mevAmountInput && mevMaturitySelect) {
                mevAmountInput.addEventListener('input', refreshMevduatTable);
                mevMaturitySelect.addEventListener('change', refreshMevduatTable);
                refreshMevduatTable();
            }
        } 
        else if (activeCategory === 'hisse') {
            container.innerHTML = `
                <div class="market-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px;">
                    ${stockData.map(s => `
                        <div class="index-card ${s.code === 'XU100' ? 'pulse-anim' : ''}">
                            <div class="index-header">
                                <span class="index-name">${s.name} (${s.code})</span>
                                <span class="trend-badge ${s.up ? 'trend-up' : 'trend-down'}">${s.trend}</span>
                            </div>
                            <div class="index-value" style="font-size: 1.75rem; font-weight: 900; color: #fff; margin: 10px 0;">${fmtVal(s.last, false)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">BIST Canlı Endeks Değeri</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Top Gainers Table -->
                <div class="card table-card">
                    <div class="table-header">
                        <h2>Günün En Çok Yükselen Hisse Senetleri</h2>
                        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top:4px;">Borsa İstanbul (BIST) bünyesinde günün tavan yapan en hareketli hisse senetleri.</p>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Hisse Kodu</th>
                                    <th>Şirket Adı</th>
                                    <th>Son Fiyat</th>
                                    <th>Günlük Değişim</th>
                                    <th>İşlem Durumu</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${singleStocks.map(stock => `
                                    <tr>
                                        <td>
                                            <span style="font-family: monospace; font-weight: 800; color: var(--brand-primary); font-size: 1rem;">${stock.code}</span>
                                        </td>
                                        <td style="font-weight: 500; color: var(--text-main); font-size: 0.9rem;">
                                            ${stock.name}
                                        </td>
                                        <td style="font-weight: 700; font-size: 0.95rem; color: #fff;">
                                            ${fmtVal(stock.last)}
                                        </td>
                                        <td style="font-weight: 800; font-size: 0.95rem; color: var(--success);">
                                            ${stock.trend}
                                        </td>
                                        <td>
                                            <span class="resilience-badge grade-aplus" style="padding: 4px 8px; font-size: 0.65rem;">İŞLEME AÇIK</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // Setup market advice text based on BIST 100 level
        const bist100Val = stockData[0].last;
        if (bist100Val > 14000) {
            adviceText.textContent = `BIST 100 endeksi 14.100 direncini kırarak rekor tazeledi (${fmtVal(bist100Val, false)}). Portföy koruma ve döviz cinsi fon direnç skoru %92. Hisse pozisyonlarının korunması, yeni girişlerde seçici olunması önerilir.`;
            hedgeCard.style.borderLeftColor = 'var(--success)';
        } else {
            adviceText.textContent = `Analiz ediliyor: BIST 100 endeksi ${fmtVal(bist100Val, false)} seviyesindedir. Korumalı pozisyon önerilir.`;
            hedgeCard.style.borderLeftColor = 'var(--warning)';
        }
    }

    function refreshWealthMgmt() {
        const hnwList = document.getElementById('hnw-recommendations-list');
        const ctx = document.getElementById('wealthForecastChart').getContext('2d');

        // --- BIST 100 Forecast Rendering (14k Target) ---
        if(wealthForecastChartInstance) wealthForecastChartInstance.destroy();
        
        const labels = ['Current', '30d', '60d', '90d', '120d', '150d', '180d'];
        const data = [12790, 13100, 13250, 13500, 13700, 13850, 14000];
        
        wealthForecastChartInstance = safeNewChart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'BIST 100 Target (pts)',
                    data: data,
                    borderColor: '#f59e0b', /* Glowing Gold */
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });

        // --- HNW Analysis & Propensity Scoring ---
        const allUsers = window.db.get('users');
        const allTxs = window.db.get('transactions');

        const recommendations = allUsers.map(u => {
            const userTxs = allTxs.filter(t => t.user_id === u.id);
            const income = userTxs.filter(t => t.type === 'income').reduce((s, t) => s + convertToUSD(t.amount, t.currency), 0);
            const expense = userTxs.filter(t => t.type === 'expense').reduce((s, t) => s + convertToUSD(t.amount, t.currency), 0);
            const net = income - expense;
            
            // Score Logic: High liquidity + positive net flow = High Propensity
            let score = 0;
            if(income > 8000) score += 40;
            if(net > 2000) score += 30;
            if(expense < (income * 0.5)) score += 30;

            return { ...u, propensity: score };
        })
        .sort((a, b) => b.propensity - a.propensity)
        .slice(0, 5); // Top 5

        hnwList.innerHTML = recommendations.map(r => `
            <div class="hnw-customer-item">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="hnw-avatar">${r.name[0]}</div>
                    <div>
                        <strong>${r.name}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Balance: Elite Tier</div>
                    </div>
                </div>
                <div class="propensity-badge ${r.propensity > 70 ? 'propensity-high' : 'propensity-med'}">
                    <span class="material-icons-round" style="font-size: 0.9rem;">rocket_launch</span>
                    ${r.propensity}% Propensity
                </div>
            </div>
        `).join('');
    }

    function refreshSystemPulse() {
        const logContainer = document.getElementById('system-ai-log');
        if(!logContainer) return;

        // Populate initial logs
        const initialLogs = [
            { action: 'BOOT', msg: 'RNN Decision Core 1.0 Initializing...' },
            { action: 'LINK', msg: 'BIST 100 WebSocket: Connected' },
            { action: 'LINK', msg: 'Global CPI / IBP Stream: Synchronized' },
            { action: 'READY', msg: 'Financial Velocity recalculated for 12,450 entities.' }
        ];

        logContainer.innerHTML = initialLogs.map(l => `
            <div class="log-entry">
                <span class="log-ts">[${new Date().toLocaleTimeString()}]</span>
                <span class="log-action">${l.action}</span>: ${l.msg}
            </div>
        `).join('');

        // Continuous Mock Log
        if (window.aiLogInterval) clearInterval(window.aiLogInterval);
        window.aiLogInterval = setInterval(() => {
            const pulseView = document.getElementById('system-pulse-view');
            if (!pulseView || pulseView.classList.contains('hidden')) return;

            const actions = ['INGEST', 'PROCESS', 'UPDATE', 'VALIDATE', 'STRESS-TEST'];
            const inputs = ['BIST 100 Tick', 'USD/TRY Delta', 'Euro Zone Inflation', 'Consumer Confidence Index'];
            
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
            
            const logLine = document.createElement('div');
            logLine.className = 'log-entry';
            logLine.innerHTML = `
                <span class="log-ts">[${new Date().toLocaleTimeString()}]</span>
                <span class="log-action">${randomAction}</span>: ${randomInput} sync successful. Core confidence: 99.8%.
            `;
            
            logContainer.appendChild(logLine);
            logContainer.scrollTop = logContainer.scrollHeight;

            // Keep log size manageable
            if (logContainer.children.length > 50) logContainer.removeChild(logContainer.firstElementChild);
        }, 1500);
    }

    // --- TRANSACTION FORM HANDLER ---
    const transactionFormRef = document.getElementById('transaction-form');
    if (transactionFormRef) {
        const txTypeSelect = document.getElementById('tx-type');
        const lblAmount = document.getElementById('lbl-tx-amount');
        const lblCategory = document.getElementById('lbl-tx-category');
        const lblDate = document.getElementById('lbl-tx-date');
        const txCategoryInput = document.getElementById('tx-category');

        if (txTypeSelect) {
            txTypeSelect.addEventListener('change', () => {
                const selectedType = txTypeSelect.value;
                if (selectedType === 'subscription') {
                    if (lblAmount) lblAmount.textContent = 'Aylık Ücret';
                    if (lblCategory) lblCategory.textContent = 'Abonelik Adı';
                    if (lblDate) lblDate.textContent = 'Sonraki Ödeme Tarihi';
                    if (txCategoryInput) txCategoryInput.placeholder = 'örn. Netflix, Spotify, YouTube Premium';
                } else {
                    if (lblAmount) lblAmount.textContent = 'Amount';
                    if (lblCategory) lblCategory.textContent = 'Category';
                    if (lblDate) lblDate.textContent = 'Date';
                    if (txCategoryInput) txCategoryInput.placeholder = 'e.g. Groceries, Rent, Salary';
                }
            });
        }

        transactionFormRef.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUser) return;

            const formData = new FormData(transactionFormRef);
            const type = formData.get('type');
            const currency = formData.get('currency') || 'USD';
            const amount = parseFloat(formData.get('amount'));
            const category = formData.get('category');
            const date = formData.get('date');

            if (type === 'subscription') {
                const newSub = {
                    user_id: currentUser.id,
                    name: category,
                    monthly_cost: amount,
                    next_payment_date: date,
                    currency: currency
                };
                window.db.insert('subscriptions', newSub);
                alert('Uygulama aboneliği başarıyla kaydedildi.');
            } else {
                const newTx = {
                    user_id: currentUser.id,
                    type: type,
                    amount: amount,
                    category: category,
                    date: date,
                    currency: currency
                };
                window.db.insert('transactions', newTx);
                alert('İşlem başarıyla kaydedildi.');
            }

            transactionFormRef.reset();
            
            // Reset labels and placeholder back to defaults
            if (lblAmount) lblAmount.textContent = 'Amount';
            if (lblCategory) lblCategory.textContent = 'Category';
            if (lblDate) lblDate.textContent = 'Date';
            if (txCategoryInput) txCategoryInput.placeholder = 'e.g. Groceries, Rent, Salary';

            // Sync UI
            refreshDashboard();
            refreshTransactionsList();

            // Return to dashboard
            const dashboardBtn = document.querySelector('[data-target="dashboard"]');
            if(dashboardBtn) dashboardBtn.click();
        });
    }

    // --- INTERACTIVE LOAN CALCULATOR HANDLERS ---
    const calcAmountSlider = document.getElementById('calc-amount-slider');
    const calcAmountInput = document.getElementById('calc-amount-input');
    const calcAmountLabel = document.getElementById('calc-amount-label');
    const calcMaturitySelect = document.getElementById('calc-maturity-select');
    const calcBankSelect = document.getElementById('calc-bank-select');
    const calcSourceSelect = document.getElementById('calc-source-select');
    const calcTriggerBtn = document.getElementById('calc-trigger-btn');

    // Populate bank dropdown dynamically (alphabetically since bankData is already sorted)
    if (calcBankSelect) {
        calcBankSelect.innerHTML = '<option value="all" selected>Tüm Bankalar</option>';
        bankData.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.name;
            opt.textContent = b.name;
            calcBankSelect.appendChild(opt);
        });
        calcBankSelect.addEventListener('change', refreshBankOffers);
    }

    if (calcAmountSlider && calcAmountInput) {
        calcAmountSlider.addEventListener('input', () => {
            calcAmountInput.value = calcAmountSlider.value;
            calcAmountLabel.textContent = formatTL(parseFloat(calcAmountSlider.value)).replace(',00', '') + ' TL';
            refreshBankOffers();
        });

        calcAmountInput.addEventListener('change', () => {
            let val = parseFloat(calcAmountInput.value);
            if (isNaN(val) || val < 5000) val = 5000;
            if (val > 1000000) val = 1000000;
            calcAmountInput.value = val;
            calcAmountSlider.value = val;
            calcAmountLabel.textContent = formatTL(val).replace(',00', '') + ' TL';
            refreshBankOffers();
        });

        calcMaturitySelect.addEventListener('change', refreshBankOffers);
        if (calcSourceSelect) {
            calcSourceSelect.addEventListener('change', refreshBankOffers);
        }

        if (calcTriggerBtn) {
            calcTriggerBtn.addEventListener('click', refreshBankOffers);
        }
    }

    // --- INVESTMENT INSTRUMENTS CATEGORY TABS HANDLER ---
    const investTabContainer = document.querySelector('.investment-tabs');
    if (investTabContainer) {
        investTabContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.invest-tab-btn');
            if (!btn) return;
            
            document.querySelectorAll('.invest-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            refreshMarketIntel();
        });
    }

    // Expose applyForLoan globally so table buttons can trigger it
    window.applyForLoan = (bankName, productTitle, amount, maturity, installment, applyUrl) => {
        alert(`Kredi Başvuru İşlemi\n\nBanka: ${bankName}\nÜrün: ${productTitle}\nTutar: ${formatTL(amount)}\nVade: ${maturity} Ay\nAylık Taksit: ${formatTL(installment)}\n\nKredi başvuru ve kampanya resmi sayfasına yönlendiriliyorsunuz.`);
        window.open(applyUrl || 'https://www.hangikredi.com', '_blank');
    };

    // --- SEASONAL CAMPAIGNS DATA & LOGIC ---
    const seasonalCampaigns = [
        {
            id: 1,
            bankName: 'Kuveyt Türk',
            logoText: 'KVT',
            bgGradient: 'linear-gradient(135deg, #115e59, #0f766e)',
            category: 'bireysel',
            title: 'Hac & Umre Finansmanı',
            subtitle: 'Diyanet ve Acenta Protokolü',
            benefits: [
                'Vade farksız (sıfır kâr payı) taksitlendirme seçenekleri',
                'Hac ve Umre ödemelerine özel ek tüketici limitleri',
                'Suudi Arabistan seyahat harcamalarında ekstre indirimleri'
            ],
            cta: 'Finansman Detaylarını Al',
            badge: 'İbadet Finansmanı',
            badgeClass: 'badge-ibadet',
            applyUrl: 'https://www.kuveytturk.com.tr/bireysel/finansmanlar/hac-ve-umre-finansmani'
        },
        {
            id: 2,
            bankName: 'VakıfBank',
            logoText: 'VAK',
            bgGradient: 'linear-gradient(135deg, #b45309, #78350f)',
            category: 'mesleki',
            title: 'Vinov Ecza Destek Paketi',
            subtitle: 'Eczacılara Özel Hazır Limitler',
            benefits: [
                '2.500.000 TL\'ye varan hazır teminat limiti avantajı',
                'Ertesi gün %0 komisyonla POS bloke çözümleri',
                'Ecza depoları ödemelerinde peşin fiyatına taksit'
            ],
            cta: 'Eczane POS Başvurusu',
            badge: 'Sağlık & Eczacı',
            badgeClass: 'badge-eczaci',
            applyUrl: 'https://www.vakifbank.com.tr/vinov.aspx'
        },
        {
            id: 3,
            bankName: 'Akbank',
            logoText: 'AKB',
            bgGradient: 'linear-gradient(135deg, #be123c, #9f1239)',
            category: 'mesleki',
            title: 'Eczacı Destek Kampanyası',
            subtitle: 'SGK Anlaşmalı Eczaneler',
            benefits: [
                'SGK ödemesini Akbank\'a taşıyana 50.000 TL nakit promosyon',
                'Sıfır faizli ecza deposu ödemeli kredileri',
                'Ücretsiz ticari EFT / Havale ve çek karnesi hakları'
            ],
            cta: 'Taahhüt Oluştur & Başvur',
            badge: 'Sağlık & Eczacı',
            badgeClass: 'badge-eczaci',
            applyUrl: 'https://www.akbank.com/tr-tr/urunler/Sayfalar/eczaci-destek-paketi.aspx'
        },
        {
            id: 4,
            bankName: 'Türkiye Finans',
            logoText: 'TFN',
            bgGradient: 'linear-gradient(135deg, #0e7490, #0f766e)',
            category: 'kobi',
            title: 'Esnaf Can Suyu POS Paketi',
            subtitle: 'Yeni Üye İş Yeri POS Alımları',
            benefits: [
                'Aylık %1,99 sabit komisyonlu fiziki ve sanal POS cihazı',
                'Aidatsız Business Kart ve indirimli kiralık kasa',
                'İlk 3 ay boyunca ücretsiz ticari EFT ve Havale hakları'
            ],
            cta: 'Esnaf POS Başvurusu',
            badge: 'KOBİ Destek',
            badgeClass: 'badge-kobi',
            applyUrl: 'https://www.turkiyefinans.com.tr/tr-tr/kobi/pos-ve-nakit-yonetimi/Sayfalar/pos-urunleri.aspx'
        },
        {
            id: 5,
            bankName: 'Şekerbank',
            logoText: 'ŞKR',
            bgGradient: 'linear-gradient(135deg, #15803d, #14532d)',
            category: 'kobi',
            title: 'Üreten Eczacı ve Esnaf Paketi',
            subtitle: 'SGK Alacak Teminatlı Çözümler',
            benefits: [
                'Yıllık 18.000 TL\'ye varan SGK nakit promosyonları',
                'Eczane yönetim ve fatura yazılımlarında %50 indirim',
                'Ertesi gün komisyonsuz hesap geçişi ayrıcalıkları'
            ],
            cta: 'Esnaf Paketine Başvur',
            badge: 'KOBİ Destek',
            badgeClass: 'badge-kobi',
            applyUrl: 'https://www.sekerbank.com.tr/esnaf/ureten-paketler'
        },
        {
            id: 6,
            bankName: 'Albaraka Türk',
            logoText: 'ALB',
            bgGradient: 'linear-gradient(135deg, #b45309, #1e293b)',
            category: 'bireysel',
            title: 'Dönemsel Umre Finansmanı',
            subtitle: 'Hassas Seyahat Finansmanı Çözümü',
            benefits: [
                'Katılım bankacılığı prensipleriyle uygun kâr payı oranları',
                'Diyanet İşleri Başkanlığı ödeme kodlarıyla anında entegrasyon',
                'Âlâ Kart sahiplerine yurt dışı seyahat sigortası hediye'
            ],
            cta: 'Umre Finansmanı Hesapla',
            badge: 'İbadet Finansmanı',
            badgeClass: 'badge-ibadet',
            applyUrl: 'https://www.albaraka.com.tr/bireysel/finansmanlar/hac-ve-umre-finansmani'
        }
    ];

    function renderSeasonalCampaigns(filterCategory = 'all') {
        const container = document.getElementById('campaigns-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const filtered = filterCategory === 'all' 
            ? seasonalCampaigns 
            : seasonalCampaigns.filter(c => c.category === filterCategory);
            
        if (filtered.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Bu kategoride şu an aktif kampanya bulunmamaktadır.</div>`;
            return;
        }
        
        container.innerHTML = filtered.map(c => `
            <div class="campaign-card-item">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <div class="bank-logo-sm" style="background: ${c.bgGradient}; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.95rem; color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                            ${c.logoText}
                        </div>
                        <span class="campaign-badge ${c.badgeClass}">${c.badge}</span>
                    </div>
                    <h3 style="color: #fff; font-size: 1.15rem; margin-bottom: 6px; font-weight: 700;">${c.title}</h3>
                    <p style="color: var(--brand-primary); font-size: 0.8rem; font-weight: 600; margin-bottom: 16px;">${c.subtitle}</p>
                    <ul class="campaign-benefit-list">
                        ${c.benefits.map(b => `<li>${b}</li>`).join('')}
                    </ul>
                </div>
                <button class="btn btn-primary w-100" style="padding: 12px; font-size: 0.8rem; border-radius: 8px; margin-top: auto;" onclick="window.applyForCampaign('${c.bankName}', '${c.title}', '${c.applyUrl}')">
                    ${c.cta}
                </button>
            </div>
        `).join('');
    }

    // Expose applyForCampaign globally so buttons can trigger it
    window.applyForCampaign = (bankName, campaignTitle, applyUrl) => {
        alert(`Kampanya Başvuru İşlemi\n\nBanka: ${bankName}\nKampanya: ${campaignTitle}\n\nKampanya resmi başvuru sayfasına yönlendiriliyorsunuz.`);
        window.open(applyUrl || 'https://www.hangikredi.com', '_blank');
    };

    // ==========================================
    // --- FINANCIAL GPS MODULE CODEBLOCK ---
    // ==========================================

    let activeGPSGoalId = null;
    let gpsFormMode = 'add';

    function initGPS() {
        if (!currentUser) {
            const gpsSelectorCard = document.getElementById('gps-selector-card');
            const gpsSetupCard = document.getElementById('gps-setup-card');
            const gpsDashboard = document.getElementById('gps-dashboard');
            if (gpsSelectorCard) gpsSelectorCard.classList.add('hidden');
            if (gpsSetupCard) gpsSetupCard.classList.add('hidden');
            if (gpsDashboard) gpsDashboard.classList.add('hidden');
            return;
        }

        const goals = window.db.getGPSGoals(currentUser.id);
        const gpsSelectorCard = document.getElementById('gps-selector-card');
        const gpsSetupCard = document.getElementById('gps-setup-card');
        const gpsDashboard = document.getElementById('gps-dashboard');
        const gpsCancelBtn = document.getElementById('gps-cancel-btn');

        if (goals.length > 0) {
            if (gpsSelectorCard) gpsSelectorCard.classList.remove('hidden');
            
            // Populate select dropdown
            const selectEl = document.getElementById('gps-goal-select');
            if (selectEl) {
                selectEl.innerHTML = goals.map(g => `<option value="${g.id}">${g.goalTitle}</option>`).join('');
                
                // Determine activeGoalId
                if (!activeGPSGoalId || !goals.some(g => g.id === activeGPSGoalId)) {
                    activeGPSGoalId = goals[0].id;
                }
                selectEl.value = activeGPSGoalId;
            }

            const activeGoal = goals.find(g => g.id === activeGPSGoalId) || goals[0];
            activeGPSGoalId = activeGoal.id;

            if (gpsSetupCard) gpsSetupCard.classList.add('hidden');
            if (gpsDashboard) gpsDashboard.classList.remove('hidden');
            if (gpsCancelBtn) gpsCancelBtn.classList.remove('hidden');

            renderGPSDashboard(activeGoal);
        } else {
            activeGPSGoalId = null;
            if (gpsSelectorCard) gpsSelectorCard.classList.add('hidden');
            if (gpsSetupCard) gpsSetupCard.classList.remove('hidden');
            if (gpsDashboard) gpsDashboard.classList.add('hidden');
            if (gpsCancelBtn) gpsCancelBtn.classList.add('hidden');

            // Reset form fields
            const gpsForm = document.getElementById('gps-setup-form');
            if (gpsForm) gpsForm.reset();

            // Set default target date as 1 year from now
            const targetDateInput = document.getElementById('gps-target-date');
            if (targetDateInput) {
                const oneYearFromNow = new Date();
                oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                targetDateInput.value = oneYearFromNow.toISOString().split('T')[0];
            }
        }
    }

    function renderGPSDashboard(goal) {
        const monthlySavings = goal.income - goal.fixedExpenses - goal.variableExpenses;
        const netAssets = goal.savings + goal.investments - goal.debts;
        const totalAssets = goal.savings + goal.investments;
        const debtRatio = totalAssets > 0 ? Math.round((goal.debts / totalAssets) * 100) : (goal.debts > 0 ? 100 : 0);
        const cashFlowPower = goal.income > 0 ? Math.round((monthlySavings / goal.income) * 100) : 0;

        // UI Updates: Stats
        const statSavings = document.getElementById('gps-stat-savings');
        const statAssets = document.getElementById('gps-stat-assets');
        const statDebtRatio = document.getElementById('gps-stat-debt-ratio');
        const statCashflow = document.getElementById('gps-stat-cashflow');

        if (statSavings) statSavings.textContent = formatTL(monthlySavings);
        if (statAssets) statAssets.textContent = formatTL(netAssets);
        if (statDebtRatio) statDebtRatio.textContent = `${debtRatio}%`;
        if (statCashflow) statCashflow.textContent = `${cashFlowPower}%`;

        // Yield Calculations
        const annualYield = goal.risk === 'dusuk' ? 0.40 : (goal.risk === 'orta' ? 0.55 : 0.70);
        const monthlyYield = annualYield / 12;

        const forecastRequiredSave = document.getElementById('gps-forecast-required-save');
        const forecastYield = document.getElementById('gps-forecast-yield');
        const forecastRiskType = document.getElementById('gps-forecast-risk-type');
        const forecastFeasibility = document.getElementById('gps-forecast-feasibility');

        if (forecastYield) forecastYield.textContent = `%${Math.round(annualYield * 100)}`;
        if (forecastRiskType) {
            forecastRiskType.textContent = goal.risk === 'dusuk' ? 'Düşük (Mevduat)' : (goal.risk === 'orta' ? 'Orta (Fonlar)' : 'Yüksek (Hisse)');
        }

        // Simulating current plan duration
        let currentWealth = netAssets;
        let months = 0;
        const maxSimMonths = 600;
        if (monthlySavings > 0) {
            while (currentWealth < goal.goalAmount && months < maxSimMonths) {
                months++;
                currentWealth += monthlySavings;
                currentWealth += currentWealth * monthlyYield;
            }
        } else {
            months = 999;
        }

        // Feasibility analysis
        const today = new Date();
        const targetDateObj = new Date(goal.targetDate);
        const targetMonths = Math.max(1, Math.round((targetDateObj - today) / (1000 * 60 * 60 * 24 * 30.4)));
        const gapMonths = months - targetMonths;

        if (forecastFeasibility) {
            if (monthlySavings <= 0) {
                forecastFeasibility.textContent = 'İmkansız (Tasarruf yok)';
                forecastFeasibility.className = 'trend-badge trend-down';
                forecastFeasibility.style.background = 'rgba(239, 68, 68, 0.15)';
                forecastFeasibility.style.color = '#ef4444';
            } else if (months <= targetMonths) {
                forecastFeasibility.textContent = 'Güvenli (Zamanında)';
                forecastFeasibility.className = 'trend-badge trend-up';
                forecastFeasibility.style.background = 'rgba(16, 185, 129, 0.15)';
                forecastFeasibility.style.color = '#10b981';
            } else if (gapMonths <= 6) {
                forecastFeasibility.textContent = 'Hafif Riskli (Yakın)';
                forecastFeasibility.className = 'trend-badge trend-up';
                forecastFeasibility.style.background = 'rgba(245, 158, 11, 0.15)';
                forecastFeasibility.style.color = '#f59e0b';
            } else {
                forecastFeasibility.textContent = 'Gecikme Riski';
                forecastFeasibility.className = 'trend-badge trend-down';
                forecastFeasibility.style.background = 'rgba(239, 68, 68, 0.15)';
                forecastFeasibility.style.color = '#ef4444';
            }
        }

        // Required monthly savings to make it exactly on targetDate
        let reqSavings = 0;
        if (targetMonths > 0) {
            const fvAssets = netAssets * Math.pow(1 + monthlyYield, targetMonths);
            const remainingToSave = goal.goalAmount - fvAssets;
            if (remainingToSave <= 0) {
                reqSavings = 0;
            } else {
                const annuityFactor = (Math.pow(1 + monthlyYield, targetMonths) - 1) / monthlyYield;
                reqSavings = remainingToSave / annuityFactor;
            }
        }
        if (forecastRequiredSave) forecastRequiredSave.textContent = formatTL(reqSavings);

        // Update timeline starting points
        const startValEl = document.getElementById('gps-step-start-val');
        if (startValEl) startValEl.textContent = formatTL(netAssets);

        const targetTitleEl = document.getElementById('gps-step-target-title');
        if (targetTitleEl) targetTitleEl.textContent = `Hedef: ${goal.goalTitle}`;

        const targetDescEl = document.getElementById('gps-step-target-desc');
        if (targetDescEl) targetDescEl.textContent = formatTL(goal.goalAmount);

        const targetDateLabel = document.getElementById('gps-step-target-date-label');
        if (targetDateLabel) {
            if (monthlySavings > 0 && months < maxSimMonths) {
                const estDate = new Date(today.getFullYear(), today.getMonth() + months, today.getDate());
                const estDateStr = estDate.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
                targetDateLabel.textContent = `Tahmini Ulaşma: ${estDateStr} (${months} ay)`;
            } else {
                targetDateLabel.textContent = `Tahmini Ulaşma: Belirsiz (Tasarruf Yetersiz)`;
            }
        }

        // Milestone 1: 50K Savings
        let state50k = 'locked';
        let badge50k = 'Kilitli';
        let progress50k = 0;
        if (netAssets >= 50000) {
            state50k = 'completed';
            badge50k = 'Tamamlandı';
            progress50k = 100;
        } else {
            state50k = 'in-progress';
            badge50k = 'Devam Ediyor';
            progress50k = Math.max(0, Math.round((netAssets / 50000) * 100));
        }
        updateStepUI('gps-step-50k', 'gps-badge-50k', 'gps-progress-50k', state50k, badge50k, progress50k);

        // Milestone 2: Emergency Fund (3 months expenses)
        const emergencyTarget = (goal.fixedExpenses + goal.variableExpenses) * 3;
        const emergencyDesc = document.getElementById('gps-step-emergency-desc');
        if (emergencyDesc) emergencyDesc.textContent = `Güvence Tutarı: ${formatTL(emergencyTarget)} (3 Aylık Gider)`;

        let stateEmerg = 'locked';
        let badgeEmerg = 'Kilitli';
        let progressEmerg = 0;
        if (netAssets >= emergencyTarget) {
            stateEmerg = 'completed';
            badgeEmerg = 'Tamamlandı';
            progressEmerg = 100;
        } else if (state50k === 'completed') {
            stateEmerg = 'in-progress';
            badgeEmerg = 'Devam Ediyor';
            progressEmerg = Math.max(0, Math.round((netAssets / emergencyTarget) * 100));
        }
        updateStepUI('gps-step-emergency', 'gps-badge-emergency', 'gps-progress-emergency', stateEmerg, badgeEmerg, progressEmerg);

        // Milestone 3: Closing Debts
        const debtDesc = document.getElementById('gps-step-debt-desc');
        if (debtDesc) {
            debtDesc.textContent = goal.debts > 0 ? `Toplam Kapatılacak Borç: ${formatTL(goal.debts)}` : 'Aktif Borç Bulunmamaktadır.';
        }

        let stateDebt = 'locked';
        let badgeDebt = 'Kilitli';
        let progressDebt = 0;
        if (goal.debts === 0) {
            stateDebt = 'completed';
            badgeDebt = 'Borçsuz';
            progressDebt = 100;
        } else if (netAssets >= goal.debts) {
            stateDebt = 'completed';
            badgeDebt = 'Tamamlandı';
            progressDebt = 100;
        } else if (stateEmerg === 'completed') {
            stateDebt = 'in-progress';
            badgeDebt = 'Devam Ediyor';
            progressDebt = Math.max(0, Math.round((netAssets / goal.debts) * 100));
        }
        updateStepUI('gps-step-debt', 'gps-badge-debt', 'gps-progress-debt', stateDebt, badgeDebt, progressDebt);

        // Target Milestone
        let stateTarget = 'locked';
        let badgeTarget = 'Kilitli';
        let progressTarget = Math.max(0, Math.min(100, Math.round((netAssets / goal.goalAmount) * 100)));
        if (netAssets >= goal.goalAmount) {
            stateTarget = 'completed';
            badgeTarget = 'Ulaşıldı';
            progressTarget = 100;
        } else if (stateDebt === 'completed' || (goal.debts > 0 && netAssets >= goal.debts) || (goal.debts === 0 && stateEmerg === 'completed')) {
            stateTarget = 'in-progress';
            badgeTarget = 'Rotada';
        }
        updateStepUI('gps-step-target', 'gps-badge-target', 'gps-progress-target', stateTarget, badgeTarget, progressTarget);

        // --- WHAT-IF SCENARIOS ---
        // Scenario 1: Current Plan
        const scen1Duration = document.getElementById('gps-scen1-duration');
        if (scen1Duration) {
            scen1Duration.textContent = (monthlySavings > 0 && months < maxSimMonths) ? `${months} ay` : 'Ulaşılamaz';
        }

        // Scenario 2: Save 10% more
        const scen2Duration = document.getElementById('gps-scen2-duration');
        if (scen2Duration) {
            const w2_save = monthlySavings > 0 ? monthlySavings * 1.10 : 0;
            if (w2_save <= 0) {
                scen2Duration.textContent = 'Ulaşılamaz';
            } else {
                let w2_wealth = netAssets;
                let w2_months = 0;
                while (w2_wealth < goal.goalAmount && w2_months < maxSimMonths) {
                    w2_months++;
                    w2_wealth += w2_save;
                    w2_wealth += w2_wealth * monthlyYield;
                }
                scen2Duration.textContent = w2_months < maxSimMonths ? `${w2_months} ay` : 'Ulaşılamaz';
            }
        }

        // Scenario 3: Higher Yield
        const scen3Duration = document.getElementById('gps-scen3-duration');
        if (scen3Duration) {
            if (monthlySavings <= 0) {
                scen3Duration.textContent = 'Ulaşılamaz';
            } else {
                const w3_yield = goal.risk === 'dusuk' ? 0.55 : (goal.risk === 'orta' ? 0.70 : 0.85);
                const w3_monthlyYield = w3_yield / 12;
                let w3_wealth = netAssets;
                let w3_months = 0;
                while (w3_wealth < goal.goalAmount && w3_months < maxSimMonths) {
                    w3_months++;
                    w3_wealth += monthlySavings;
                    w3_wealth += w3_wealth * w3_monthlyYield;
                }
                scen3Duration.textContent = w3_months < maxSimMonths ? `${w3_months} ay` : 'Ulaşılamaz';
            }
        }

        // Scenario 4: Finance
        const scen4Duration = document.getElementById('gps-scen4-duration');
        if (scen4Duration) {
            const gap = goal.goalAmount - netAssets;
            if (gap <= 0) {
                scen4Duration.innerHTML = '<span style="color: var(--success);">Kredi Gerekmiyor</span>';
            } else {
                const maturity = gap > 150000 ? 36 : 24;
                const monthlyRate = 0.035;
                const payment = gap * (monthlyRate * Math.pow(1 + monthlyRate, maturity)) / (Math.pow(1 + monthlyRate, maturity) - 1);
                
                const isAffordable = payment <= monthlySavings && monthlySavings > 0;
                const statusColor = isAffordable ? 'var(--success)' : 'var(--danger)';
                const statusText = isAffordable ? 'Ödenebilir' : 'Gelir Yetersiz';
                
                scen4Duration.innerHTML = `
                    <div style="font-size: 1.15rem; color: #fff;">${formatTL(payment)}/ay</div>
                    <div style="font-size: 0.75rem; color: ${statusColor}; font-weight: 700; margin-top: 4px;">${maturity} Ay Vade | ${statusText}</div>
                `;
            }
        }

        // --- AI NOTICE CAROUSEL & RECOMMENDATIONS ---
        const aiNoticeText = document.getElementById('gps-ai-notification-text');
        
        // Calculate months saved with 8% cost cut
        const totalExpenses = goal.fixedExpenses + goal.variableExpenses;
        const extraSave8 = totalExpenses * 0.08;
        const newSave8 = monthlySavings + extraSave8;
        let wNew_wealth = netAssets;
        let wNew_months = 0;
        while (wNew_wealth < goal.goalAmount && wNew_months < maxSimMonths && newSave8 > 0) {
            wNew_months++;
            wNew_wealth += newSave8;
            wNew_wealth += wNew_wealth * monthlyYield;
        }
        const savedMonths = months - wNew_months;

        if (monthlySavings <= 0) {
            if (aiNoticeText) aiNoticeText.textContent = "Aylık giderleriniz gelirinize eşit veya fazla. Hedefinize ulaşmak için lütfen giderlerinizi azaltın.";
        } else if (savedMonths > 0 && months < maxSimMonths) {
            if (aiNoticeText) aiNoticeText.textContent = `Harcamalarınızı %8 azaltırsanız hedefinize ${savedMonths} ay daha erken ulaşabilirsiniz.`;
        } else {
            if (aiNoticeText) aiNoticeText.textContent = "Banka kampanyalarını kullanarak bu ay 430 TL ek tasarruf sağlayabilirsiniz.";
        }

        // Render Recommendations List
        const listContainer = document.getElementById('gps-suggestions-container');
        if (listContainer) {
            const listItems = [];
            
            // Item 1: Expenses
            if (goal.variableExpenses > 5000) {
                listItems.push({
                    type: 'warning',
                    icon: 'savings',
                    text: 'Değişken giderlerdeki abonelikleri veya yeme-içme harcamalarını optimize ederek aylık tasarrufunuzu artırabilirsiniz.'
                });
            } else {
                listItems.push({
                    type: 'success',
                    icon: 'check_circle',
                    text: 'Mevcut harcama disiplininiz çok iyi. Sabit giderlerinizi optimize etmek için alternatif hizmet paketlerini araştırabilirsiniz.'
                });
            }

            // Item 2: Yield / Deposit / Stocks
            if (goal.risk === 'dusuk') {
                listItems.push({
                    type: 'info',
                    icon: 'trending_up',
                    text: 'Birikimlerinizi %54 faiz sunan ON Dijital veya Alternatif Bank vadeli mevduat hesaplarında değerlendirerek hedefinize 3 ay daha erken ulaşabilirsiniz.'
                });
            } else {
                listItems.push({
                    type: 'info',
                    icon: 'trending_up',
                    text: 'Finera Managed Equity fonlarındaki BIST 100 endeks geçiş fırsatlarını değerlendirerek getiri oranınızı artırabilirsiniz.'
                });
            }

            // Item 3: Debts / Credit
            if (goal.debts > 0) {
                listItems.push({
                    type: 'danger',
                    icon: 'account_balance',
                    text: 'Bankalar & Teklifler bölümündeki borç transfer kredilerini kullanarak borç oranınızı aşağı çekebilirsiniz.'
                });
            } else {
                listItems.push({
                    type: 'success',
                    icon: 'campaign',
                    text: 'Yeni müşterilere sunulan %0 faizli nakit avans kampanyalarından yararlanarak hedefinize faizsiz katkı sağlayın.'
                });
            }

            listContainer.innerHTML = listItems.map(item => `
                <li class="opt-item ${item.type}">
                    <span class="material-icons-round notranslate icon">${item.icon}</span>
                    <div class="opt-text">${item.text}</div>
                </li>
            `).join('');
        }
    }

    function updateStepUI(stepId, badgeId, progressId, state, badgeText, progressPercent) {
        const stepEl = document.getElementById(stepId);
        const badgeEl = document.getElementById(badgeId);
        const progressEl = document.getElementById(progressId);
        
        if (stepEl) {
            stepEl.classList.remove('completed', 'in-progress', 'locked');
            stepEl.classList.add(state);
        }
        if (badgeEl) {
            badgeEl.className = `gps-badge ${state}`;
            badgeEl.textContent = badgeText;
        }
        if (progressEl) {
            progressEl.style.width = `${progressPercent}%`;
        }
    }

    // --- FINANCIAL GPS EVENT LISTENERS ---
    const gpsForm = document.getElementById('gps-setup-form');
    if (gpsForm) {
        gpsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUser) return;

            const goalData = {
                income: parseFloat(document.getElementById('gps-income').value),
                savings: parseFloat(document.getElementById('gps-savings').value),
                fixedExpenses: parseFloat(document.getElementById('gps-fixed-expense').value),
                variableExpenses: parseFloat(document.getElementById('gps-variable-expense').value),
                investments: parseFloat(document.getElementById('gps-investments').value),
                debts: parseFloat(document.getElementById('gps-debts').value),
                risk: document.getElementById('gps-risk').value,
                goalType: document.getElementById('gps-goal-type').value,
                goalTitle: document.getElementById('gps-goal-title').value,
                goalAmount: parseFloat(document.getElementById('gps-goal-amount').value),
                targetDate: document.getElementById('gps-target-date').value
            };

            if (gpsFormMode === 'edit' && activeGPSGoalId) {
                window.db.updateGPSGoal(activeGPSGoalId, goalData);
            } else {
                const record = window.db.addGPSGoal(currentUser.id, goalData);
                activeGPSGoalId = record.id;
            }
            initGPS();
        });
    }

    const gpsEditBtn = document.getElementById('gps-edit-btn');
    if (gpsEditBtn) {
        gpsEditBtn.addEventListener('click', () => {
            if (!currentUser || !activeGPSGoalId) return;
            const goal = window.db.getGPSGoal(activeGPSGoalId);
            if (goal) {
                gpsFormMode = 'edit';
                document.getElementById('gps-income').value = goal.income;
                document.getElementById('gps-savings').value = goal.savings;
                document.getElementById('gps-fixed-expense').value = goal.fixedExpenses;
                document.getElementById('gps-variable-expense').value = goal.variableExpenses;
                document.getElementById('gps-investments').value = goal.investments;
                document.getElementById('gps-debts').value = goal.debts;
                document.getElementById('gps-risk').value = goal.risk;
                document.getElementById('gps-goal-type').value = goal.goalType;
                document.getElementById('gps-goal-title').value = goal.goalTitle;
                document.getElementById('gps-goal-amount').value = goal.goalAmount;
                document.getElementById('gps-target-date').value = goal.targetDate;
            }
            
            document.getElementById('gps-setup-card').classList.remove('hidden');
            document.getElementById('gps-dashboard').classList.add('hidden');
        });
    }

    const gpsDeleteBtn = document.getElementById('gps-delete-btn');
    if (gpsDeleteBtn) {
        gpsDeleteBtn.addEventListener('click', () => {
            if (!currentUser || !activeGPSGoalId) return;
            const goal = window.db.getGPSGoal(activeGPSGoalId);
            if (!goal) return;

            if (confirm(`"${goal.goalTitle}" hedefini silmek istediğinize emin misiniz?`)) {
                window.db.deleteGPSGoal(activeGPSGoalId);
                activeGPSGoalId = null;
                initGPS();
            }
        });
    }

    const gpsAddNewBtn = document.getElementById('gps-add-new-btn');
    if (gpsAddNewBtn) {
        gpsAddNewBtn.addEventListener('click', () => {
            gpsFormMode = 'add';
            const gpsForm = document.getElementById('gps-setup-form');
            if (gpsForm) gpsForm.reset();

            // Pre-populate fields from the currently active goal, if any, to make it easier for user
            if (activeGPSGoalId) {
                const goal = window.db.getGPSGoal(activeGPSGoalId);
                if (goal) {
                    document.getElementById('gps-income').value = goal.income;
                    document.getElementById('gps-savings').value = goal.savings;
                    document.getElementById('gps-fixed-expense').value = goal.fixedExpenses;
                    document.getElementById('gps-variable-expense').value = goal.variableExpenses;
                    document.getElementById('gps-investments').value = goal.investments;
                    document.getElementById('gps-debts').value = goal.debts;
                    document.getElementById('gps-risk').value = goal.risk;
                }
            }

            // Set default date as 1 year from now
            const targetDateInput = document.getElementById('gps-target-date');
            if (targetDateInput) {
                const oneYearFromNow = new Date();
                oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                targetDateInput.value = oneYearFromNow.toISOString().split('T')[0];
            }

            document.getElementById('gps-setup-card').classList.remove('hidden');
            document.getElementById('gps-dashboard').classList.add('hidden');
        });
    }

    const gpsCancelBtn = document.getElementById('gps-cancel-btn');
    if (gpsCancelBtn) {
        gpsCancelBtn.addEventListener('click', () => {
            if (activeGPSGoalId) {
                document.getElementById('gps-setup-card').classList.add('hidden');
                document.getElementById('gps-dashboard').classList.remove('hidden');
            }
        });
    }

    const gpsGoalSelect = document.getElementById('gps-goal-select');
    if (gpsGoalSelect) {
        gpsGoalSelect.addEventListener('change', (e) => {
            activeGPSGoalId = e.target.value;
            const goal = window.db.getGPSGoal(activeGPSGoalId);
            if (goal) {
                renderGPSDashboard(goal);
            }
        });
    }

    // ==========================================
    // --- AI DECISION ASSISTANT CODEBLOCK ---
    // ==========================================

    function initDecision() {
        if (!currentUser) {
            const setupCard = document.getElementById('decision-setup-card');
            const dashboard = document.getElementById('decision-results-dashboard');
            if (setupCard) setupCard.classList.add('hidden');
            if (dashboard) dashboard.classList.add('hidden');
            return;
        }

        const setupCard = document.getElementById('decision-setup-card');
        const dashboard = document.getElementById('decision-results-dashboard');
        
        const decisions = window.db.getAIDecisions(currentUser.id);
        
        if (decisions.length > 0) {
            const lastDec = decisions[decisions.length - 1];
            if (setupCard) setupCard.classList.add('hidden');
            if (dashboard) dashboard.classList.remove('hidden');
            renderDecisionDashboard(lastDec);
        } else {
            if (setupCard) setupCard.classList.remove('hidden');
            if (dashboard) dashboard.classList.add('hidden');
            
            // Auto-populate based on GPS goals or defaults
            const gpsGoals = window.db.getGPSGoals(currentUser.id);
            const activeGoal = gpsGoals[0] || null;

            document.getElementById('dec-age').value = '32';
            document.getElementById('dec-income').value = activeGoal ? activeGoal.income : '45000';
            document.getElementById('dec-savings').value = activeGoal ? activeGoal.savings : '25000';
            document.getElementById('dec-expenses').value = activeGoal ? (activeGoal.fixedExpenses + activeGoal.variableExpenses) : '25000';
            document.getElementById('dec-investments').value = activeGoal ? activeGoal.investments : '35000';
            document.getElementById('dec-debts').value = activeGoal ? activeGoal.debts : '5000';
            document.getElementById('dec-risk').value = activeGoal ? activeGoal.risk : 'orta';
            document.getElementById('dec-goals').value = activeGoal ? `${activeGoal.goalTitle} hedefine ulaşmak` : '3 yıl içinde ev almak';
            document.getElementById('dec-question').value = '';
        }
    }

    function evaluateDecision(inputData) {
        const q = inputData.question.toLowerCase();
        let title = "";
        let summary = "";
        let riskText = "";
        let gainText = "";
        let score = 85;
        let confidence = 89;
        let options = [];
        let actions = [];

        if (q.includes("araba") || q.includes("araç") || q.includes("otobil") || q.includes("motor")) {
            title = "Yatırım Yapmak & Mevcut Aracı Korumak";
            summary = "Mevcut gelir ve gider dengeniz göz önüne alındığında, sıfır veya yeni bir araç almak yerine mevcut birikiminizi yatırıma yönlendirmeniz finansal özgürlüğünüzü hızlandıracaktır. Araçlar amortisman ve bakım maliyetleri nedeniyle pasif gider üretirken, yatırım seçenekleri aktif getiri yaratır.";
            riskText = "Orta Risk";
            gainText = "+%42 (3 Yıl)";
            score = 89;
            confidence = 91;
            options = [
                { name: "Yatırım Yapmak (Fon/Hisse)", score: 89, recommended: true, details: { yield: "Yüksek (%40-70 Yıllık)", risk: "Orta", cashflow: "Olumlu (Düzenli getiri)", liquidity: "Hızlı (T+2)" } },
                { name: "Mevcut Arabayı Yenilemek", score: 72, recommended: false, details: { yield: "Sıfır / Negatif (Amortisman)", risk: "Düşük", cashflow: "Olumsuz (Bakım, sigorta)", liquidity: "Yavaş (Satış süreci)" } },
                { name: "Mevduatta Tutmak", score: 65, recommended: false, details: { yield: "Orta (%54 Yıllık)", risk: "Çok Düşük", cashflow: "Düzenli Nakit", liquidity: "Çok Hızlı" } }
            ];
            actions = [
                "Birikiminizin en az %60'ını hisse senedi ve Eurobond fon sepetine yönlendirin.",
                "Geri kalan %40'ı acil durumlar için yüksek getirili vadeli mevduatta tutun.",
                "Mevcut aracınızın bakımını aksatmayarak büyük arıza maliyetlerinin önüne geçin."
            ];
        } else if (q.includes("ev") || q.includes("konut") || q.includes("daire") || q.includes("kira") || q.includes("arsa")) {
            title = "Kirada Kalıp Birikimi Yatırımda Büyütmek";
            summary = "Konut kredisi faiz oranlarının yüksek seyrettiği bu dönemde krediyle ev almak yerine, birikimlerinizi fon veya mevduatta büyüterek kira maliyetinizi getiriyle sübvanse etmek finansal açıdan daha dengeli bir seçenektir.";
            riskText = "Düşük-Orta";
            gainText = "+%55 (3 Yıl)";
            score = 91;
            confidence = 87;
            options = [
                { name: "Kirada Kalıp Birikimi Yatırmak", score: 91, recommended: true, details: { yield: "Yüksek (%55-70)", risk: "Orta", cashflow: "Kira giderini karşılar", liquidity: "Çok Yüksek" } },
                { name: "Kredi ile Ev Satın Almak", score: 82, recommended: false, details: { yield: "Uzun Vadeli Değer Artışı", risk: "Yüksek (Kredi faizi)", cashflow: "Çok Sıkışık (Yüksek taksit)", liquidity: "Çok Yavaş" } },
                { name: "Altın/Döviz Biriktirmek", score: 67, recommended: false, details: { yield: "Orta (Enflasyon Koruması)", risk: "Düşük", cashflow: "Sıfır Nakit Akışı", liquidity: "Hızlı" } }
            ];
            actions = [
                "Kira kontratınızı koruyarak sabit gider artışınızı minimize edin.",
                "Yatırımlarınızı dengeli yatırım fonlarında (hisse/altın sepetleri) değerlendirin.",
                "Konut kredi faizleri %2'nin altına inene kadar alım kararını erteleyin."
            ];
        } else if (q.includes("borç") || q.includes("kapatmak") || q.includes("borcum") || q.includes("kredi kart")) {
            title = "Yatırım Yapmak & Yüksek Faizli Borçları Kapatmak";
            summary = "Mevcut borç faiz oranları, piyasadaki ortalama yatırım getirilerinden yüksek olduğu için öncelikle borçları kapatmak garantili bir getiri (%100 faiz tasarrufu) sağlar. Borçsuz bir nakit akışı en büyük yatırımdır.";
            riskText = "Çok Düşük";
            gainText = "+%65 (Tasarruf)";
            score = 94;
            confidence = 95;
            options = [
                { name: "Borçları Kapatmak", score: 94, recommended: true, details: { yield: "Garantili Faiz Tasarrufu", risk: "Sıfır", cashflow: "Çok Olumlu (Taksitler biter)", liquidity: "Orta (Kredi limitleri)" } },
                { name: "Birikimle Yatırım Yapmak", score: 75, recommended: false, details: { yield: "Değişken (%45-55)", risk: "Orta", cashflow: "Nötr", liquidity: "Yüksek" } },
                { name: "Mevduatta Tutmak", score: 60, recommended: false, details: { yield: "Orta (%54)", risk: "Çok Düşük", cashflow: "Kısmi Getiri", liquidity: "Hızlı" } }
            ];
            actions = [
                "Aylık faiz maliyeti %4'ü geçen tüm borçlarınızı bugün tek seferde kapatın.",
                "Kart harcamalarınızı asgari tutar yerine her ay tamamen ödeyecek şekilde sınırlayın.",
                "Borç ödemesinden boşalan bütçeyi anında otomatik fon yatırımına yönlendirin."
            ];
        } else if (q.includes("altın") || q.includes("dolar") || q.includes("euro") || q.includes("döviz") || q.includes("faiz") || q.includes("mevduat")) {
            title = "Çeşitlendirilmiş Portföy Yapısı";
            summary = "Tek bir finansal araca (sadece döviz veya sadece altın) yatırım yapmak yerine, birikimlerinizi mevduat faizinin istikrarlı getirisi ile altın/hisse koruması arasında bölüştürmek risk/getiri dengesini en iyi duruma getirir.";
            riskText = "Düşük Risk";
            gainText = "+%48 (3 Yıl)";
            score = 88;
            confidence = 90;
            options = [
                { name: "Çeşitlendirilmiş Portföy (Altın+Mevduat)", score: 88, recommended: true, details: { yield: "Dengeli Getiri", risk: "Düşük", cashflow: "Kısmi Nakit Girişi", liquidity: "Çok Hızlı" } },
                { name: "Sadece Vadeli Mevduatta Tutmak", score: 78, recommended: false, details: { yield: "Yüksek Getiri (%54 Yıllık)", risk: "Sıfır", cashflow: "Yüksek Aylık Gelir", liquidity: "Yüksek" } },
                { name: "Sadece Döviz Biriktirmek", score: 55, recommended: false, details: { yield: "Düşük (Enflasyon altı)", risk: "Düşük", cashflow: "Sıfır", liquidity: "Çok Hızlı" } }
            ];
            actions = [
                "Paranızın %50'sini ON Dijital veya Alternatif Bank vadeli mevduatına yönlendirin.",
                "Geri kalan %50'yi altın fonları veya fiziki altın ile kur riskine karşı çapa yapın.",
                "Yabancı para birimlerini nakit tutmak yerine Eurobond fonları gibi getirili araçlarda değerlendirin."
            ];
        } else {
            title = "Çeşitlendirilmiş Yatırım Sepeti";
            summary = "Risk profiliniz ve mevcut nakit akış gücünüz incelendiğinde, paranızı tek bir yere yatırmak yerine hisse fonları, altın ve yüksek getirili mevduat arasında bölüştürmeniz en güvenli yoldur.";
            riskText = "Orta Risk";
            gainText = "+%45 (3 Yıl)";
            score = 85;
            confidence = 89;
            options = [
                { name: "Çeşitlendirilmiş Yatırım Sepeti", score: 85, recommended: true, details: { yield: "Dengeli Getiri (%50-60)", risk: "Orta", cashflow: "Olumlu", liquidity: "Yüksek" } },
                { name: "Vadeli Mevduat Getirisi", score: 74, recommended: false, details: { yield: "Orta (%54 Yıllık)", risk: "Çok Düşük", cashflow: "Yüksek Aylık Gelir", liquidity: "Yüksek" } },
                { name: "Nakit veya Likit Fonlar", score: 58, recommended: false, details: { yield: "Düşük Getiri", risk: "Sıfır", cashflow: "Nötr", liquidity: "Anında" } }
            ];
            actions = [
                "Her ay düzenli olarak gelirinizin en az %15'ini otomatik birikime aktarın.",
                "İşlem komisyonlarını en aza indirmek için dijital bankacılık fırsatlarını seçin.",
                "Piyasa dalgalanmalarını panik yapmadan uzun vadeli bir birikim disipliniyle izleyin."
            ];
        }

        return { question: inputData.question, title, summary, riskText, gainText, score, confidence, options, actions };
    }

    function renderDecisionDashboard(decision) {
        document.getElementById('dec-best-option-title').textContent = decision.title;
        document.getElementById('dec-ai-summary').textContent = decision.summary;
        document.getElementById('dec-score-value').textContent = `${decision.score}/100`;
        document.getElementById('dec-confidence-value').textContent = `%${decision.confidence}`;
        document.getElementById('dec-risk-value').textContent = decision.riskText;
        document.getElementById('dec-gain-value').textContent = decision.gainText;

        const badge = document.getElementById('dec-confidence-badge');
        if (badge) {
            if (decision.confidence >= 90) {
                badge.textContent = "Yüksek Güven";
                badge.style.background = "rgba(16, 185, 129, 0.15)";
                badge.style.color = "#10b981";
            } else {
                badge.textContent = "Orta Güven";
                badge.style.background = "rgba(245, 158, 11, 0.15)";
                badge.style.color = "#f59e0b";
            }
        }

        const matrixContainer = document.getElementById('dec-matrix-container');
        if (matrixContainer) {
            matrixContainer.innerHTML = decision.options.map(opt => `
                <div>
                    <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 6px; font-size: 0.9rem;">
                        <span>${opt.name}</span>
                        <span style="color: ${opt.recommended ? 'var(--brand-primary)' : 'var(--text-muted)'};">${opt.score}/100</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${opt.score}%; height: 100%; background: ${opt.recommended ? 'linear-gradient(90deg, var(--brand-primary), var(--emerald-wealth))' : 'rgba(255,255,255,0.15)'}; border-radius: 4px;"></div>
                    </div>
                </div>
            `).join('');
        }

        const comparativeContainer = document.getElementById('dec-comparative-container');
        if (comparativeContainer) {
            comparativeContainer.innerHTML = decision.options.map(opt => `
                <div class="card" style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 16px;">
                    <h4 style="margin: 0 0 10px 0; color: #fff; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; justify-content: space-between;">
                        <span>${opt.name}</span>
                        ${opt.recommended ? '<span style="font-size: 0.7rem; background: var(--brand-primary); color: #fff; padding: 2px 8px; border-radius: 4px;">Önerilen</span>' : ''}
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 0.8rem; color: var(--text-muted);">
                        <div><strong style="color: #fff;">Getiri Potansiyeli:</strong> ${opt.details.yield}</div>
                        <div><strong style="color: #fff;">Risk Derecesi:</strong> ${opt.details.risk}</div>
                        <div><strong style="color: #fff;">Nakit Akışı Etkisi:</strong> ${opt.details.cashflow}</div>
                        <div><strong style="color: #fff;">Likidite Eşiği:</strong> ${opt.details.liquidity}</div>
                    </div>
                </div>
            `).join('');
        }

        const actionsContainer = document.getElementById('dec-actions-container');
        if (actionsContainer) {
            actionsContainer.innerHTML = decision.actions.map(act => `
                <li class="opt-item info" style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px;">
                    <span class="material-icons-round notranslate icon" style="color: var(--brand-primary); font-size: 1.25rem; margin-top: 2px;">double_arrow</span>
                    <div class="opt-text" style="color: var(--text-main); font-size: 0.9rem; font-weight: 500;">${act}</div>
                </li>
            `).join('');
        }
    }

    // --- AI DECISION EVENT LISTENERS ---
    const decisionForm = document.getElementById('decision-setup-form');
    if (decisionForm) {
        decisionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUser) return;

            const inputData = {
                age: parseInt(document.getElementById('dec-age').value),
                income: parseFloat(document.getElementById('dec-income').value),
                savings: parseFloat(document.getElementById('dec-savings').value),
                expenses: parseFloat(document.getElementById('dec-expenses').value),
                investments: parseFloat(document.getElementById('dec-investments').value),
                debts: parseFloat(document.getElementById('dec-debts').value),
                risk: document.getElementById('dec-risk').value,
                goals: document.getElementById('dec-goals').value,
                question: document.getElementById('dec-question').value
            };

            const evaluation = evaluateDecision(inputData);
            window.db.addAIDecision(currentUser.id, evaluation);
            initDecision();
        });
    }

    const decNewBtn = document.getElementById('dec-new-btn');
    if (decNewBtn) {
        decNewBtn.addEventListener('click', () => {
            document.getElementById('decision-setup-card').classList.remove('hidden');
            document.getElementById('decision-results-dashboard').classList.add('hidden');
            document.getElementById('dec-question').value = '';
            document.getElementById('dec-question').focus();
        });
    }

    // ==========================================
    // --- FOMO WALL (MISSED OPPORTUNITIES) ---
    // ==========================================

    function initFOMO() {
        if (!currentUser) {
            const fomoView = document.getElementById('fomo-wall-view');
            if (fomoView) fomoView.classList.add('hidden');
            return;
        }

        // Get custom dynamic data based on user persona
        const fomoData = getFOMODataForUser(currentUser.id);
        renderFOMOWall(fomoData);
    }

    function getFOMODataForUser(userId) {
        const dbSubs = window.db.get('subscriptions').filter(s => s.user_id === userId);
        const userSubs = dbSubs.map(s => ({
            name: s.name,
            cost: `${formatTransactionAmount(s.monthly_cost, s.currency)}/ay`,
            status: `Sonraki Ödeme: ${s.next_payment_date || 'Belirtilmedi'}`
        }));

        if (userId === 2) {
            // SME Persona
            return {
                totalLoss: "68.420 TL",
                score: "54/100",
                scoreDesc: "Kayıp oranınız oldukça yüksek. Özellikle nakit akışınızın negatif seyrettiği bu dönemde ticari faiz oranları ve POS kampanyalarını kaçırmanız şirketinize ek yük getmektedir.",
                recoverable: "18.500 TL",
                commentary: "Şirketinizin nakit akış gücü kritik seviyededir. Ticari alacakların tahsilat süreleri ve atıl işletme sermayesi yönetimi nedeniyle son 12 ayda 68.420 TL fırsat kaçırılmıştır. Ticari kampanya ve POS avantajlarının entegrasyonu acil önem taşımaktadır.",
                alerts: [
                    "⚠️ Negatif nakit akışı nedeniyle son 3 ayda 9.800 TL ticari kredi faizi fazladan ödendi.",
                    "⚠️ POS komisyon oranlarındaki indirim kampanyası kaçırıldı; aylık tahmini kayıp 3.500 TL.",
                    "⚠️ Atıl duran tedarikçi depozito ödemeleri gecelik mevduatta değerlendirilmedi; 22.500 TL kayıp.",
                    "⚠️ Kullanılmayan AWS sunucu ve kurumsal yazılım lisansları için son 12 ayda 18.000 TL atıl harcandı."
                ],
                campaigns: [
                    { name: "Ticari POS / Komisyon Kampanyası", amount: "18.200 TL", bank: "Şekerbank Esnaf POS", date: "Son 12 Ay" },
                    { name: "Filo Akaryakıt Taşıt Tanıma İndirimi", amount: "4.300 TL", bank: "Akbank Ticari Kart", date: "Son 12 Ay" },
                    { name: "Ofis & Tedarik Harcamaları Kart İadesi", amount: "2.920 TL", bank: "Albaraka KOBİ Kampanyası", date: "Son 6 Ay" }
                ],
                idleCash: "Şirket vadesiz hesabında ortalama <strong>150.000 TL</strong> bakiye son 6 ayda ticari mevduatta değerlendirilmedi; <strong>22.500 TL</strong> ek getiri kaybı oluştu.",
                loans: "Çektiğiniz yüksek oranlı ticari rotatif kredilerin alternatif bankalarla yapılandırılmaması nedeniyle toplam <strong>9.800 TL</strong> fazla geri ödeme yapıldı.",
                investments: [
                    { type: "Kur Korumalı Mevduat (KKM)", difference: "%14 daha fazla", risk: "Çok Düşük" },
                    { type: "Hazine Bonosu / Devlet Tahvili", difference: "%11 daha fazla", risk: "Düşük" }
                ],
                subscriptions: [
                    ...userSubs,
                    { name: "AWS Enterprise Atıl Sunucu", cost: "12.000 TL/yıl", status: "Kullanım oranı: %15" },
                    { name: "Enterprise SaaS Kullanıcı Lisansları", cost: "6.000 TL/yıl", status: "Kullanım oranı: %40" }
                ],
                recovery: [
                    "Şekerbank Üreten Esnaf Paketine geçiş yaparak POS komisyon oranınızı %1.99'a çekin; aylık <strong>3.500 TL</strong> kazanın.",
                    "AWS sunucu kapasitelerinizi ölçeklendirerek kullanmadığınız paketleri iptal edin; yıllık <strong>12.000 TL</strong> tasarruf edin.",
                    "Cari hesaplardaki günlük bakiyeleri gecelik repoda veya ticari günlük faizde tutun."
                ]
            };
        } else if (userId === 3) {
            // Corporate Persona
            return {
                totalLoss: "245.900 TL",
                score: "88/100",
                scoreDesc: "Kurumsal fon yönetiminiz genel olarak profesyonel. Ancak hacimlerin büyüklüğü nedeniyle hazine yönetiminde ufak oran kaçışları dahi yüksek tutarlı kayıplara yol açmaktadır.",
                recoverable: "74.200 TL",
                commentary: "Büyük ölçekli bütçe yönetiminizde fonların nemalandırılma sürelerindeki (özellikle hafta sonu ve valör kayıpları) optimizasyon eksikliği nedeniyle son 12 ayda 245.900 TL potansiyel fırsat kaçırılmıştır. Hazine işlemlerinde valör kayıplarının önlenmesi karlılığınızı artıracaktır.",
                alerts: [
                    "⚠️ Hafta sonu valör kayıpları nedeniyle son 12 ayda 82.000 TL gecelik repo getirisi kaçırıldı.",
                    "⚠️ Toplu dış ticaret döviz transferlerinde alternatif kur marjları kullanılmadı; 74.000 TL kayıp.",
                    "⚠️ Kurumsal lojistik filosu finansmanında kampanya dışı kredi kullanımı; 48.000 TL fazla maliyet.",
                    "⚠️ Kurumsal ERP yazılım lisanslarının atıl kapasitesi nedeniyle 26.800 TL gereksiz ödendi."
                ],
                campaigns: [
                    { name: "Hacimli Dış Ticaret Döviz Marj İndirimi", amount: "74.000 TL", bank: "Alternatif Bank Kur Kampanyaları", date: "Son 12 Ay" },
                    { name: "Filo Kasko / Sigorta Kampanyaları", amount: "15.200 TL", bank: "Ziraat Katılım", date: "Son 12 Ay" }
                ],
                idleCash: "Kurumsal cari hesaplarda valör bekleyen ortalama <strong>1.200.000 TL</strong> nakit bakiye repo veya blokeli mevduatta tutulmadı; <strong>82.000 TL</strong> faiz kaybı oluştu.",
                loans: "Şirket kurumsal taşıt/tır filosu alımında kampanya dışı uzun vadeli kredi kullanımı nedeniyle <strong>48.000 TL</strong> fazla maliyet üstlenildi.",
                investments: [
                    { type: "Eurobond / Hazine Kağıtları", difference: "%19 getiri farkı", risk: "Düşük" },
                    { type: "BIST 100 Endeksli Kurumsal Portföy", difference: "%12 getiri farkı", risk: "Orta" }
                ],
                subscriptions: [
                    ...userSubs,
                    { name: "ERP Atıl Kullanıcı Lisansları", cost: "18.000 TL/yıl", status: "Kullanım oranı: %60" },
                    { name: "Kurumsal SaaS Veri Depolama Fazlası", cost: "8.800 TL/yıl", status: "Kullanım oranı: %20" }
                ],
                recovery: [
                    "Alternatif Bank dış ticaret kur marjı entegrasyonu ile döviz alım-satım işlemlerinde kur kaybını önleyin ve yıllık <strong>74.000 TL</strong> kurtarın.",
                    "Cari hesaplardaki hafta sonu nakit fazlalarını otomatik olarak repo / fon süpürme talimatına bağlayın.",
                    "ERP kullanıcı lisans sayınızı güncel personel sayısına göre revize ederek yıllık <strong>18.000 TL</strong> tasarruf edin."
                ]
            };
        } else {
            // Retail Persona (Default User 1)
            return {
                totalLoss: "14.860 TL",
                score: "82/100",
                scoreDesc: "Finansal fırsatların büyük bölümünü değerlendiriyorsunuz. Son dönemde özellikle kampanya ve mevduat getirilerinde iyileştirme potansiyeli bulunmaktadır.",
                recoverable: "2.500 TL",
                commentary: "Finansal davranışlarınız genel olarak dengeli görünmektedir. Ancak kullanılmayan kampanyalar ve atıl bakiyeler nedeniyle son 12 ayda önemli miktarda potansiyel kazanç fırsatı kaçırılmıştır. Önerilen aksiyonlar uygulandığında önümüzdeki yıl yaklaşık %60 daha fazla finansal verimlilik sağlanabilir.",
                alerts: [
                    "⚠️ Bu ay yaklaşık 600 TL kampanya avantajı kaçırdınız.",
                    "⚠️ Hesabınızda bekleyen bakiye için günlük vadeli hesap değerlendirmesi önerilmektedir.",
                    "⚠️ Kredi faiz oranlarında avantajlı dönem başladı, refinansman imkanlarını inceleyin.",
                    "⚠️ Son 3 ayda toplam 1.420 TL potansiyel kazanç fırsatı kaçırıldı."
                ],
                campaigns: [
                    { name: "Market Harcamaları Akbank İndirimi", amount: "820 TL", bank: "Akbank Kampanyası", date: "Son 12 Ay" },
                    { name: "Akaryakıt Alımları İade Fırsatı", amount: "640 TL", bank: "Kuveyt Türk Kartı", date: "Son 12 Ay" },
                    { name: "Restoran & Yemek Harcamaları İadesi", amount: "880 TL", bank: "Garanti Bonus Kampanyası", date: "Son 6 Ay" }
                ],
                idleCash: "Hesabınızda ortalama <strong>25.000 TL</strong> bakiye son 8 ay boyunca değerlendirilmeksizin bekledi. Bu tutar günlük faiz veya mevduatta değerlendirilseydi yaklaşık <strong>4.850 TL</strong> ek getiri sağlayabilirdi.",
                loans: "Çekmiş olduğunuz ihtiyaç kredisi döneminde piyasada daha düşük maliyetli alternatifler bulunuyordu. Yapılandırma yapsaydınız toplamda <strong>2.200 TL</strong> daha az geri ödeme yapabilirdiniz.",
                investments: [
                    { type: "Altın / Altın Yatırım Fonu", difference: "%18 daha fazla getiri", risk: "Düşük" },
                    { type: "Finera BIST 100 Hisse Fonu", difference: "%26 daha fazla getiri", risk: "Orta-Yüksek" }
                ],
                subscriptions: [
                    ...userSubs,
                    { name: "Kullanılmayan Spor Salonu Üyeliği", cost: "2.400 TL/yıl", status: "Kullanım oranı: %8" },
                    { name: "Müzik/Dizi Platformu Ek Paketleri", cost: "740 TL/yıl", status: "Kullanım oranı: %0" }
                ],
                recovery: [
                    "Bu ay market harcamalarınızı Akbank kredi kartı kampanyasıyla yaparsanız yaklaşık <strong>420 TL</strong> avantaj sağlayabilirsiniz.",
                    "Boşta duran vadesiz bakiyeniz için ON Hesap günlük faiz hesabı açarak aylık getiri kaybınızı durdurun.",
                    "Kullanmadığınız spor ve dijital aboneliklerinizi askıya alarak hemen ayda <strong>260 TL</strong> tasarruf sağlayın."
                ]
            };
        }
    }

    function renderFOMOWall(data) {
        document.getElementById('fomo-total-loss-val').textContent = data.totalLoss;
        document.getElementById('fomo-score').textContent = data.score;
        document.getElementById('fomo-score-desc').textContent = data.scoreDesc;
        document.getElementById('fomo-recoverable-val').textContent = data.recoverable;
        document.getElementById('fomo-ai-commentary').innerHTML = data.commentary;

        // Alerts
        const alertsContainer = document.getElementById('fomo-notifications-container');
        if (alertsContainer) {
            alertsContainer.innerHTML = data.alerts.map(alert => `
                <div class="card" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.15); padding: 12px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; color: #fff;">
                    ${alert}
                </div>
            `).join('');
        }

        // Campaigns
        const campaignsContainer = document.getElementById('fomo-campaigns-list');
        if (campaignsContainer) {
            campaignsContainer.innerHTML = data.campaigns.map(c => `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                    <div>
                        <strong style="color: #fff; display: block; margin-bottom: 2px;">${c.name}</strong>
                        <span style="color: var(--text-muted); font-size: 0.75rem;">${c.bank} | ${c.date}</span>
                    </div>
                    <span style="color: #ef4444; font-weight: 800; font-size: 0.95rem;">-${c.amount}</span>
                </div>
            `).join('');
        }

        // Idle Cash
        const idleCashContainer = document.getElementById('fomo-idle-cash-content');
        if (idleCashContainer) {
            idleCashContainer.innerHTML = `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; font-size: 0.85rem; line-height: 1.5; color: var(--text-main);">
                    ${data.idleCash}
                </div>
                <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; color: #f59e0b; display: flex; align-items: center; gap: 6px;">
                    <span class="material-icons-round notranslate" style="font-size: 1.1rem;">info</span>
                    Günlük vadeli hesaplarda faiz getirisi oranı şu an %54 civarındadır.
                </div>
            `;
        }

        // Loans
        const loansContainer = document.getElementById('fomo-loans-content');
        if (loansContainer) {
            loansContainer.innerHTML = `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; font-size: 0.85rem; line-height: 1.5; color: var(--text-main);">
                    ${data.loans}
                </div>
                <div style="background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.15); padding: 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; color: #a855f7; display: flex; align-items: center; gap: 6px;">
                    <span class="material-icons-round notranslate" style="font-size: 1.1rem;">bolt</span>
                    Refinansman yaparak aylık taksitlerinizi düşürebilirsiniz.
                </div>
            `;
        }

        // Investments
        const investmentsContainer = document.getElementById('fomo-investments-content');
        if (investmentsContainer) {
            investmentsContainer.innerHTML = data.investments.map(i => `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                    <div>
                        <strong style="color: #fff; display: block; margin-bottom: 2px;">${i.type}</strong>
                        <span style="color: var(--text-muted); font-size: 0.75rem;">Risk Seviyesi: ${i.risk}</span>
                    </div>
                    <span style="color: var(--brand-primary); font-weight: 800;">${i.difference}</span>
                </div>
            `).join('');
        }

        // Subscriptions
        const subscriptionsContainer = document.getElementById('fomo-subscriptions-content');
        if (subscriptionsContainer) {
            subscriptionsContainer.innerHTML = data.subscriptions.map(s => `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                    <div>
                        <strong style="color: #fff; display: block; margin-bottom: 2px;">${s.name}</strong>
                        <span style="color: var(--text-muted); font-size: 0.75rem;">${s.status}</span>
                    </div>
                    <span style="color: #ef4444; font-weight: 700;">${s.cost}</span>
                </div>
            `).join('');
        }

        // Recovery List
        const recoveryContainer = document.getElementById('fomo-recovery-list');
        if (recoveryContainer) {
            recoveryContainer.innerHTML = data.recovery.map(rec => `
                <li class="opt-item success" style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px;">
                    <span class="material-icons-round notranslate icon" style="color: var(--emerald-wealth); font-size: 1.25rem; margin-top: 2px;">check_circle</span>
                    <div class="opt-text" style="color: var(--text-main); font-size: 0.9rem; font-weight: 500;">${rec}</div>
                </li>
            `).join('');
        }
    }

    // Boot App
        initApp();
    } catch (e) {
        console.error("Critical app.js boot error:", e);
        const errOverlay = document.getElementById('global-error-overlay');
        if (errOverlay) {
            errOverlay.style.display = 'block';
            errOverlay.querySelector('.err-msg').textContent = e.message;
            errOverlay.querySelector('.err-stack').textContent = e.stack;
        }
    }
});


