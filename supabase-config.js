/**
 * ============================================================================
 * FÚRIA VOLEIBOL - SERVIÇO DE DADOS E SEGURANÇA (SUPABASE CLOUD + RLS)
 * ============================================================================
 * Conectado ao projeto oficial Supabase: furia-voleibol (kegzklscgzowhdfclsim)
 */

const SUPABASE_CONFIG = {
    url: 'https://kegzklscgzowhdfclsim.supabase.co',
    publishableKey: 'sb_publishable_6aTahH6sN-uWmbR0GSuDcA_FReO56Oc'
};

const NO_MAP_SENTINEL = 'https://no-map.furia.local';
const NO_STATUS_SENTINEL = '__no_status__';
const SPIRIT_CARD_SENTINEL = '__SPIRIT_CARD__';
const SPIRIT_CARD_MAPS_SENTINEL = 'https://spirit-card.furia.local';
const SPIRIT_STORAGE_KEY = 'furia_spirit_cards_v1';

const DEFAULT_SPIRIT_CARDS = [
    {
        slug: 'organizacao',
        display_order: 1,
        icon: 'fa-solid fa-clipboard-check',
        title: 'Organização',
        summary: 'Listas de presença organizadas, gestão de vagas e inscrições oficiais pelo VolleyDash.',
        badge: 'VolleyDash & Lista de Jogos',
        content: 'Na Fúria, cada jogo e treino começa com planeamento claro. Utilizamos o VolleyDash para organizar as listas de presença, controlar vagas por nível e manter os horários sempre atualizados para toda a equipa.',
        highlights: [
            'Inscrição prática e lista de espera automática através do VolleyDash',
            'Vagas organizadas por categoria e nível (Iniciante, Intermediário e Avançado)',
            'Confirmação antecipada de presença e acesso rápido à lista de próximos jogos'
        ],
        media_items: [],
        cta_label: 'Abrir série no VolleyDash',
        cta_url: 'https://www.volleydash.online/series/c8be0e',
        show_games_list: true
    },
    {
        slug: 'respeito',
        display_order: 2,
        icon: 'fa-solid fa-users',
        title: 'Respeito',
        summary: 'Comunidade acolhedora, jogo limpo e parceria verdadeira dentro e fora de quadra.',
        badge: 'Comunidade Fúria',
        content: 'Mais do que pontos no marcador, valorizamos as pessoas em quadra. Construímos um grupo unido, respeitoso e aberto onde cada atleta se sente bem-vindo para jogar, aprender e partilhar bons momentos juntos.',
        highlights: [
            'Ambiente positivo, incentivos reais e zero tolerância a atitudes tóxicas',
            'Integração constante de novos membros com a comunidade da Fúria',
            'Registos fotográficos dos nossos encontros, celebrações e espírito de equipa'
        ],
        media_items: [
            {
                type: 'image',
                url: 'public/img/hero_bg.jpg',
                caption: 'Comunidade Fúria reunida no pavilhão antes dos jogos'
            }
        ],
        cta_label: 'Conhecer a Comunidade',
        cta_url: 'https://wa.me/351911977113',
        show_games_list: false
    },
    {
        slug: 'evolucao',
        display_order: 3,
        icon: 'fa-solid fa-arrow-trend-up',
        title: 'Evolução',
        summary: 'Treinos consistentes, dias definidos na semana e intercâmbios com equipas parceiras.',
        badge: 'Treinos, Dias & Parceiros',
        content: 'A nossa evolução acontece treino após treino. Mantemos encontros semanais fixos às quartas-feiras (20h30 às 22h30) na Arca d’Água, além de sessões extras focadas em fundamentos, tática coletiva e jogos amistosos com equipas parceiras.',
        highlights: [
            'Treinos e jogos regulares às quartas-feiras com foco técnico e tático',
            'Evolução contínua de passe, levantamento, ataque, bloqueio e rotação',
            'Amistosos e treinos conjuntos com grupos e equipas parceiras do Porto'
        ],
        media_items: [],
        cta_label: 'Ver Dias no Calendário',
        cta_url: '#calendar',
        show_games_list: false
    },
    {
        slug: 'bons_jogos',
        display_order: 4,
        icon: 'fa-solid fa-volleyball',
        title: 'Bons Jogos',
        summary: 'Takes reais dos nossos jogos indoor e o projeto do Time Intermediário da Fúria.',
        badge: 'Time Intermediário & Takes',
        content: 'Jogamos com garra do primeiro ao último ponto para proporcionar partidas disputadas e divertidas. Aqui reunimos alguns takes em vídeo das nossas noites de quadra e os bastidores do Time Intermediário que estamos a formar para novos desafios.',
        highlights: [
            'Takes e melhores momentos captados diretamente nas nossas quadras',
            'Estruturação do Time Intermediário da Fúria para jogos e torneios mais competitivos',
            'Ritmo intenso, entregas em defesa e vibração a cada rali vencido'
        ],
        media_items: [
            {
                type: 'video',
                url: 'public/video/indoor.mp4',
                caption: 'Take indoor dos nossos jogos — intensidade Fúria em quadra'
            }
        ],
        cta_label: 'Quero Jogar com a Fúria',
        cta_url: '#join',
        show_games_list: false
    }
];

const SECURITY_KEYS = {
    LOGIN_ATTEMPTS: 'furia_sec_auth_attempts_v2',
    LAST_ACTIVITY: 'furia_sec_last_activity_v2'
};

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inatividade encerra sessão

let supabaseClient = null;
if (typeof window !== 'undefined' && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storageKey: 'furia-voleibol-admin-auth'
        }
    });
}

/**
 * Sincronização de sessão entre páginas locais (resolve isolamento de localStorage
 * entre arquivos file:// no Firefox e outros navegadores)
 */
const CrossPageSessionBridge = {
    encodeSessionPayload(session) {
        if (!session || !session.access_token || !session.refresh_token) return '';
        try {
            const raw = JSON.stringify({
                a: session.access_token,
                r: session.refresh_token,
                t: Date.now()
            });
            return btoa(encodeURIComponent(raw));
        } catch {
            return '';
        }
    },

    decodeSessionPayload(encoded) {
        if (!encoded) return null;
        try {
            const jsonStr = decodeURIComponent(atob(encoded));
            const obj = JSON.parse(jsonStr);
            if (obj && obj.a && obj.r) {
                return { access_token: obj.a, refresh_token: obj.r };
            }
            return null;
        } catch {
            return null;
        }
    },

    buildCalendarRedirectUrl(session) {
        const tokenParam = this.encodeSessionPayload(session);
        if (tokenParam) {
            return `index.html#furia_session=${encodeURIComponent(tokenParam)}&section=calendar`;
        }
        return 'index.html#calendar';
    },

    saveHandoff(session) {
        if (typeof window === 'undefined' || !session) return;
        try {
            window.name = JSON.stringify({
                __furia_auth_bridge: true,
                action: 'session',
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                ts: Date.now()
            });
        } catch {
            // Ignore
        }
    },

    saveLogoutSignal() {
        if (typeof window === 'undefined') return;
        try {
            window.name = JSON.stringify({
                __furia_auth_bridge: true,
                action: 'logout',
                ts: Date.now()
            });
        } catch {
            // Ignore
        }
    },

    async synchronizeIfNeeded() {
        if (typeof window === 'undefined' || !supabaseClient) return;

        // 1. Verifica se a URL contém handoff de sessão (#furia_session=...)
        try {
            const hash = window.location.hash || '';
            if (hash.includes('furia_session=')) {
                const match = hash.match(/furia_session=([^&]+)/);
                if (match && match[1]) {
                    const tokens = this.decodeSessionPayload(decodeURIComponent(match[1]));
                    if (tokens) {
                        await supabaseClient.auth.setSession({
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token
                        });
                        this.saveHandoff(tokens);
                    }
                }
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search + '#calendar');
                }
                const calSection = document.getElementById('calendar');
                if (calSection) {
                    setTimeout(() => calSection.scrollIntoView({ behavior: 'smooth' }), 100);
                }
                return;
            }
        } catch {
            // Ignore URL hash errors
        }

        // 2. Verifica se window.name contém handoff da mesma aba
        try {
            if (!window.name || !window.name.startsWith('{')) return;
            const parsed = JSON.parse(window.name);
            if (!parsed || !parsed.__furia_auth_bridge) return;

            if (parsed.action === 'logout') {
                window.name = '';
                await supabaseClient.auth.signOut();
                return;
            }

            if (parsed.action === 'session' && parsed.access_token && parsed.refresh_token) {
                const { data: current } = await supabaseClient.auth.getSession();
                const currentToken = current && current.session && current.session.access_token;
                if (currentToken !== parsed.access_token) {
                    await supabaseClient.auth.setSession({
                        access_token: parsed.access_token,
                        refresh_token: parsed.refresh_token
                    });
                }
            }
        } catch {
            // Ignore malformed window.name
        }
    }
};

function sanitizeCtaUrl(url) {
    const clean = String(url || '').trim();
    if (!clean) return '';
    if (/^#[a-zA-Z0-9_-]+$/.test(clean) || /^https?:\/\//i.test(clean)) {
        return clean;
    }
    throw new Error('O link de ação deve começar com https://, http:// ou #secao.');
}

function sanitizeMediaUrl(url) {
    const clean = String(url || '').trim();
    if (!clean) return '';
    if (/^https?:\/\//i.test(clean) || /^public\/[a-zA-Z0-9_.\-\/]+$/.test(clean)) {
        return clean;
    }
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(clean)) {
        return clean;
    }
    throw new Error('URL de mídia inválida. Utilize links https://, caminhos em public/ ou upload de imagem PNG/JPG/WEBP.');
}

function normalizeSpiritCard(raw, fallback) {
    const base = fallback || {};
    const rawHighlights = Array.isArray(raw && raw.highlights)
        ? raw.highlights
        : (typeof (raw && raw.highlights) === 'string'
            ? raw.highlights.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
            : (base.highlights || []));

    const rawMedia = Array.isArray(raw && raw.media_items) ? raw.media_items : (base.media_items || []);
    const mediaItems = rawMedia
        .map(item => {
            if (!item || !item.url) return null;
            try {
                const safeUrl = sanitizeMediaUrl(item.url);
                const inferredVideo = item.type === 'video' || /\.(mp4|webm|ogg)(\?|$)/i.test(safeUrl);
                return {
                    type: inferredVideo ? 'video' : 'image',
                    url: safeUrl,
                    caption: String(item.caption || '').trim().slice(0, 160)
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean);

    return {
        slug: (raw && raw.slug) || base.slug,
        display_order: Number((raw && raw.display_order) || base.display_order || 1),
        icon: String((raw && raw.icon) || base.icon || 'fa-solid fa-bolt').trim(),
        title: String((raw && raw.title) || base.title || '').trim(),
        summary: String((raw && raw.summary) || base.summary || '').trim(),
        badge: String((raw && raw.badge !== undefined ? raw.badge : base.badge) || '').trim(),
        content: String((raw && raw.content) || base.content || '').trim(),
        highlights: rawHighlights.map(h => String(h).trim()).filter(Boolean).slice(0, 10),
        media_items: mediaItems.slice(0, 12),
        cta_label: String((raw && raw.cta_label !== undefined ? raw.cta_label : base.cta_label) || '').trim(),
        cta_url: String((raw && raw.cta_url !== undefined ? raw.cta_url : base.cta_url) || '').trim(),
        show_games_list: typeof (raw && raw.show_games_list) === 'boolean'
            ? raw.show_games_list
            : Boolean(base.show_games_list),
        updated_at: (raw && raw.updated_at) || null
    };
}

function readSpiritLocalCache() {
    try {
        const raw = localStorage.getItem(SPIRIT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeSpiritLocalCache(cardsArray) {
    try {
        const map = {};
        (cardsArray || []).forEach(c => {
            if (c && c.slug) map[c.slug] = c;
        });
        localStorage.setItem(SPIRIT_STORAGE_KEY, JSON.stringify(map));
    } catch {
        // Ignore storage quota errors
    }
}

function cloneDefaultSpiritCards() {
    return DEFAULT_SPIRIT_CARDS.map(card => normalizeSpiritCard(card, card));
}

function isMissingSpiritTableError(err) {
    if (!err) return false;
    const msg = String(err.message || err.details || err.hint || '').toLowerCase();
    return err.code === 'PGRST205' || err.code === '42P01' || msg.includes('spirit_cards');
}

/**
 * Validação opcional de URLs seguras (http:// ou https://)
 */
function sanitizeOptionalUrl(url, fieldLabel) {
    const clean = String(url || '').trim();
    if (!clean) return '';
    if (!/^https?:\/\//i.test(clean)) {
        throw new Error(`O campo "${fieldLabel}" deve começar com https:// ou http://`);
    }
    return clean;
}

/**
 * Normaliza linha vinda do banco para o frontend
 */
function mapDbRowToGame(row) {
    if (!row) return row;
    const rawMaps = row.maps_url === NO_MAP_SENTINEL ? '' : (row.maps_url || '');
    const rawStatus = row.score_result === NO_STATUS_SENTINEL ? '' : (row.status || '');
    return {
        ...row,
        gender_category: row.gender_category || 'Misto',
        game_level: row.game_level || 'Intermediário',
        maps_url: rawMaps,
        registration_url: row.registration_url || '',
        status: rawStatus
    };
}

/**
 * Controle de bloqueio progressivo contra ataques de força bruta
 */
const LoginSecurityGuard = {
    getState() {
        try {
            const raw = sessionStorage.getItem(SECURITY_KEYS.LOGIN_ATTEMPTS);
            return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
        } catch {
            return { count: 0, lockedUntil: 0 };
        }
    },

    saveState(state) {
        try {
            sessionStorage.setItem(SECURITY_KEYS.LOGIN_ATTEMPTS, JSON.stringify(state));
        } catch {
            // Ignore storage errors
        }
    },

    checkLockout() {
        const state = this.getState();
        const now = Date.now();
        if (state.lockedUntil && now < state.lockedUntil) {
            const remainingSec = Math.ceil((state.lockedUntil - now) / 1000);
            throw new Error(`Muitas tentativas falhadas. Por segurança, aguarde ${remainingSec}s antes de tentar novamente.`);
        }
    },

    recordFailure() {
        const state = this.getState();
        state.count = (state.count || 0) + 1;
        if (state.count >= 5) {
            state.lockedUntil = Date.now() + 120 * 1000;
        } else if (state.count >= 3) {
            state.lockedUntil = Date.now() + 30 * 1000;
        }
        this.saveState(state);
        return state;
    },

    reset() {
        try {
            sessionStorage.removeItem(SECURITY_KEYS.LOGIN_ATTEMPTS);
        } catch {
            // Ignore
        }
    }
};

/**
 * Monitor de inatividade para encerrar a sessão administrativa automaticamente
 */
let inactivityTimer = null;
function setupInactivityMonitor(onTimeoutCallback) {
    if (typeof window === 'undefined') return;

    const resetTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(async () => {
            if (supabaseClient) {
                const { data } = await supabaseClient.auth.getSession();
                if (data && data.session) {
                    CrossPageSessionBridge.saveLogoutSignal();
                    await supabaseClient.auth.signOut();
                    if (typeof onTimeoutCallback === 'function') {
                        onTimeoutCallback();
                    }
                }
            }
        }, INACTIVITY_TIMEOUT_MS);
    };

    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
        window.addEventListener(evt, resetTimer, { passive: true });
    });
    resetTimer();
}

/**
 * Serviço Oficial de Dados e Autenticação Fúria Voleibol
 */
const FuriaDataService = {
    isCloudActive() {
        return Boolean(supabaseClient);
    },

    getCalendarRedirectUrl(session) {
        return CrossPageSessionBridge.buildCalendarRedirectUrl(session);
    },

    startInactivityGuard(onTimeoutCallback) {
        setupInactivityMonitor(onTimeoutCallback);
    },

    getLockoutRemainingSeconds() {
        const state = LoginSecurityGuard.getState();
        const now = Date.now();
        if (state.lockedUntil && now < state.lockedUntil) {
            return Math.ceil((state.lockedUntil - now) / 1000);
        }
        return 0;
    },

    // --- AUTENTICAÇÃO SEGURA ---
    async getCurrentSession() {
        if (!supabaseClient) return null;
        try {
            await CrossPageSessionBridge.synchronizeIfNeeded();

            const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
            if (sessionErr || !sessionData || !sessionData.session) return null;

            CrossPageSessionBridge.saveHandoff(sessionData.session);

            const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
            if (userErr || !userData || !userData.user) {
                CrossPageSessionBridge.saveLogoutSignal();
                await supabaseClient.auth.signOut();
                return null;
            }

            const user = userData.user;
            const role = user.app_metadata && user.app_metadata.role;
            if (role !== 'furia_admin') {
                CrossPageSessionBridge.saveLogoutSignal();
                await supabaseClient.auth.signOut();
                return null;
            }

            return { user, session: sessionData.session, mode: 'supabase' };
        } catch {
            return null;
        }
    },

    async signIn(email, password, honeypotValue = '') {
        if (honeypotValue && String(honeypotValue).trim() !== '') {
            await new Promise(r => setTimeout(r, 1200));
            throw new Error('Solicitação bloqueada pelo filtro de segurança anti-bot.');
        }

        LoginSecurityGuard.checkLockout();

        if (!supabaseClient) {
            throw new Error('Cliente de segurança Supabase não inicializado. Verifique a conexão.');
        }

        const cleanEmail = String(email || '').trim().toLowerCase();
        if (!cleanEmail || !password) {
            throw new Error('Preencha o e-mail e a palavra-passe.');
        }

        const jitterMs = 250 + Math.floor(Math.random() * 250);
        await new Promise(r => setTimeout(r, jitterMs));

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: cleanEmail,
            password: String(password)
        });

        if (error || !data || !data.user || !data.session) {
            const failState = LoginSecurityGuard.recordFailure();
            if (failState.lockedUntil && Date.now() < failState.lockedUntil) {
                const secs = Math.ceil((failState.lockedUntil - Date.now()) / 1000);
                throw new Error(`Credenciais inválidas. Acesso temporariamente bloqueado por ${secs}s para proteção contra força bruta.`);
            }
            throw new Error('Credenciais de administrador inválidas.');
        }

        const role = data.user.app_metadata && data.user.app_metadata.role;
        if (role !== 'furia_admin') {
            CrossPageSessionBridge.saveLogoutSignal();
            await supabaseClient.auth.signOut();
            LoginSecurityGuard.recordFailure();
            throw new Error('Acesso negado: esta conta não possui privilégios de administrador da Fúria.');
        }

        LoginSecurityGuard.reset();
        CrossPageSessionBridge.saveHandoff(data.session);
        return { user: data.user, session: data.session, mode: 'supabase' };
    },

    async signOut() {
        CrossPageSessionBridge.saveLogoutSignal();
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
    },

    // --- CRUD DE JOGOS E SÉRIES RECORRENTES ---
    async fetchGames() {
        if (!supabaseClient) return [];
        const { data, error } = await supabaseClient
            .from('games')
            .select('*')
            .order('game_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) {
            throw new Error('Erro ao carregar o calendário: ' + error.message);
        }
        return (data || [])
            .filter(row => row && row.location_name !== SPIRIT_CARD_SENTINEL)
            .map(mapDbRowToGame);
    },

    normalizeGamePayload(payload) {
        const title = String(payload.title || '').trim();
        if (title.length < 2) {
            throw new Error('O título do jogo deve ter pelo menos 2 caracteres.');
        }
        const locationName = String(payload.location_name || '').trim();
        if (locationName.length < 2) {
            throw new Error('Informe o nome do local ou quadra.');
        }

        const cleanMapsUrl = sanitizeOptionalUrl(payload.maps_url, 'Link do Google Maps');
        const cleanRegistrationUrl = sanitizeOptionalUrl(payload.registration_url, 'Link para Inscrição');
        const genderCategory = payload.gender_category || 'Misto';
        const gameLevel = payload.game_level || 'Intermediário';
        const hasStatus = Boolean(payload.status && String(payload.status).trim() !== '');

        return {
            series_id: payload.series_id || null,
            title,
            category: 'Amistoso', // Compatibilidade com constraint legada da tabela
            team_level: 'Todos os Níveis', // Compatibilidade com constraint legada da tabela
            gender_category: genderCategory,
            game_level: gameLevel,
            status: hasStatus ? payload.status : 'Confirmado',
            score_result: hasStatus ? null : NO_STATUS_SENTINEL,
            recurrence_type: payload.recurrence_type || 'unico',
            recurrence_label: payload.recurrence_label || 'Jogo Único',
            game_date: payload.game_date,
            start_time: payload.all_day ? '00:00' : (payload.start_time || '20:00'),
            end_time: payload.all_day ? '23:59' : (payload.end_time || null),
            all_day: Boolean(payload.all_day),
            location_name: locationName,
            maps_url: cleanMapsUrl || NO_MAP_SENTINEL,
            registration_url: cleanRegistrationUrl || null,
            opponent: payload.opponent ? String(payload.opponent).trim() : null,
            notes: payload.notes ? String(payload.notes).trim() : null
        };
    },

    async createGamesBatch(gamesArray) {
        if (!supabaseClient) throw new Error('Supabase não conectado.');
        await CrossPageSessionBridge.synchronizeIfNeeded();
        const normalizedRows = gamesArray.map(g => this.normalizeGamePayload(g));

        const { data, error } = await supabaseClient
            .from('games')
            .insert(normalizedRows)
            .select();

        if (error) {
            throw new Error('Erro ao salvar no calendário: ' + error.message);
        }
        return (data || []).map(mapDbRowToGame);
    },

    async updateGame(id, payload, updateEntireSeries = false, seriesId = null) {
        if (!supabaseClient) throw new Error('Supabase não conectado.');
        await CrossPageSessionBridge.synchronizeIfNeeded();
        const clean = this.normalizeGamePayload(payload);

        if (updateEntireSeries && seriesId) {
            const sharedFields = {
                title: clean.title,
                gender_category: clean.gender_category,
                game_level: clean.game_level,
                status: clean.status,
                score_result: clean.score_result,
                start_time: clean.start_time,
                end_time: clean.end_time,
                all_day: clean.all_day,
                location_name: clean.location_name,
                maps_url: clean.maps_url,
                registration_url: clean.registration_url,
                opponent: clean.opponent,
                notes: clean.notes
            };

            const { error: seriesErr } = await supabaseClient
                .from('games')
                .update(sharedFields)
                .eq('series_id', seriesId);

            if (seriesErr) {
                throw new Error('Erro ao atualizar série recorrente: ' + seriesErr.message);
            }
        }

        const { data, error } = await supabaseClient
            .from('games')
            .update({
                title: clean.title,
                gender_category: clean.gender_category,
                game_level: clean.game_level,
                status: clean.status,
                score_result: clean.score_result,
                game_date: clean.game_date,
                start_time: clean.start_time,
                end_time: clean.end_time,
                all_day: clean.all_day,
                location_name: clean.location_name,
                maps_url: clean.maps_url,
                registration_url: clean.registration_url,
                opponent: clean.opponent,
                notes: clean.notes
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error('Erro ao atualizar jogo: ' + error.message);
        }
        return mapDbRowToGame(data);
    },

    async moveGameDate(id, newDateStr) {
        if (!supabaseClient) throw new Error('Supabase não conectado.');
        await CrossPageSessionBridge.synchronizeIfNeeded();
        const { data, error } = await supabaseClient
            .from('games')
            .update({ game_date: newDateStr })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error('Erro ao reagendar data do jogo: ' + error.message);
        }
        return mapDbRowToGame(data);
    },

    async deleteGame(id, deleteEntireSeries = false, seriesId = null) {
        if (!supabaseClient) throw new Error('Supabase não conectado.');
        await CrossPageSessionBridge.synchronizeIfNeeded();

        if (deleteEntireSeries && seriesId) {
            const { error } = await supabaseClient
                .from('games')
                .delete()
                .eq('series_id', seriesId);

            if (error) throw new Error('Erro ao excluir série de jogos: ' + error.message);
            return true;
        }

        const { error } = await supabaseClient
            .from('games')
            .delete()
            .eq('id', id);

        if (error) throw new Error('Erro ao excluir jogo: ' + error.message);
        return true;
    },

    // --- CRUD DOS CARDS EXPANSÍVEIS ("ESSE É O NOSSO ESPÍRITO!") ---
    getDefaultSpiritCards() {
        return cloneDefaultSpiritCards();
    },

    async fetchSpiritCards() {
        const defaults = cloneDefaultSpiritCards();
        const remoteMap = {};
        let fetchedFromCloud = false;

        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('spirit_cards')
                    .select('*')
                    .order('display_order', { ascending: true });

                if (!error && Array.isArray(data)) {
                    fetchedFromCloud = true;
                    data.forEach(row => {
                        if (row && row.slug) remoteMap[row.slug] = row;
                    });
                } else if (isMissingSpiritTableError(error)) {
                    // Fallback transparente em public.games caso public.spirit_cards ainda não exista
                    const { data: sentinelRows, error: sentinelErr } = await supabaseClient
                        .from('games')
                        .select('id, recurrence_label, opponent, updated_at')
                        .eq('location_name', SPIRIT_CARD_SENTINEL);

                    if (!sentinelErr && Array.isArray(sentinelRows)) {
                        fetchedFromCloud = true;
                        sentinelRows.forEach(row => {
                            if (row && row.recurrence_label && row.opponent) {
                                try {
                                    const parsed = JSON.parse(row.opponent);
                                    remoteMap[row.recurrence_label] = {
                                        ...parsed,
                                        slug: row.recurrence_label,
                                        updated_at: row.updated_at || parsed.updated_at
                                    };
                                } catch {
                                    // Ignora JSON inválido
                                }
                            }
                        });
                    }
                }
            } catch {
                // Usa cache local se offline
            }
        }

        const localMap = readSpiritLocalCache();
        const merged = defaults.map(defCard => {
            const source = remoteMap[defCard.slug] || (!fetchedFromCloud ? localMap[defCard.slug] : null) || localMap[defCard.slug];
            return source ? normalizeSpiritCard(source, defCard) : defCard;
        });

        if (fetchedFromCloud) {
            const remoteOverrides = defaults.map(defCard =>
                remoteMap[defCard.slug] ? normalizeSpiritCard(remoteMap[defCard.slug], defCard) : defCard
            );
            writeSpiritLocalCache(remoteOverrides);
            return remoteOverrides;
        }

        return merged;
    },

    async saveSpiritCard(cardPayload) {
        const defaultsMap = {};
        cloneDefaultSpiritCards().forEach(c => { defaultsMap[c.slug] = c; });

        const slug = String((cardPayload && cardPayload.slug) || '').trim();
        const baseCard = defaultsMap[slug];
        if (!baseCard) {
            throw new Error('Identificador de card inválido.');
        }

        const title = String((cardPayload && cardPayload.title) || '').trim();
        const summary = String((cardPayload && cardPayload.summary) || '').trim();
        const content = String((cardPayload && cardPayload.content) || '').trim();
        if (title.length < 2) throw new Error('O título do card deve ter pelo menos 2 caracteres.');
        if (summary.length < 4) throw new Error('O resumo do card deve ter pelo menos 4 caracteres.');
        if (content.length < 4) throw new Error('O conteúdo expandido deve ter pelo menos 4 caracteres.');

        const safeCtaUrl = sanitizeCtaUrl(cardPayload.cta_url);
        const rawMedia = Array.isArray(cardPayload.media_items) ? cardPayload.media_items : [];
        const validatedMedia = rawMedia.map(item => ({
            type: item && item.type === 'video' ? 'video' : 'image',
            url: sanitizeMediaUrl(item && item.url),
            caption: String((item && item.caption) || '').trim().slice(0, 160)
        }));

        const normalized = normalizeSpiritCard({
            ...cardPayload,
            slug,
            cta_url: safeCtaUrl,
            media_items: validatedMedia,
            updated_at: new Date().toISOString()
        }, baseCard);

        if (supabaseClient) {
            await CrossPageSessionBridge.synchronizeIfNeeded();

            const dbRow = {
                slug: normalized.slug,
                display_order: normalized.display_order,
                icon: normalized.icon,
                title: normalized.title,
                summary: normalized.summary,
                badge: normalized.badge || null,
                content: normalized.content,
                highlights: normalized.highlights,
                media_items: normalized.media_items,
                cta_label: normalized.cta_label || null,
                cta_url: normalized.cta_url || null,
                show_games_list: normalized.show_games_list,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabaseClient
                .from('spirit_cards')
                .upsert(dbRow, { onConflict: 'slug' })
                .select()
                .single();

            if (!error && data) {
                const saved = normalizeSpiritCard(data, baseCard);
                const cacheMap = readSpiritLocalCache();
                cacheMap[saved.slug] = saved;
                writeSpiritLocalCache(Object.values(cacheMap));
                return saved;
            }

            if (isMissingSpiritTableError(error)) {
                // Fallback seguro na tabela public.games usando linha sentinela com RLS admin
                const { data: existingRows, error: findErr } = await supabaseClient
                    .from('games')
                    .select('id')
                    .eq('location_name', SPIRIT_CARD_SENTINEL)
                    .eq('recurrence_label', slug);

                if (findErr) {
                    throw new Error('Erro ao consultar armazenamento dos cards: ' + findErr.message);
                }

                const sentinelPayload = {
                    series_id: null,
                    title: normalized.title.slice(0, 160),
                    category: 'Evento Especial',
                    team_level: 'Todos os Níveis',
                    gender_category: 'Misto',
                    game_level: 'Intermediário',
                    status: 'Confirmado',
                    score_result: NO_STATUS_SENTINEL,
                    recurrence_type: 'unico',
                    recurrence_label: slug,
                    game_date: '1970-01-01',
                    start_time: '00:00',
                    end_time: null,
                    all_day: true,
                    location_name: SPIRIT_CARD_SENTINEL,
                    maps_url: SPIRIT_CARD_MAPS_SENTINEL,
                    registration_url: null,
                    opponent: JSON.stringify(normalized),
                    notes: 'Conteúdo administrativo do card expansível: ' + slug
                };

                if (existingRows && existingRows.length > 0) {
                    const { error: updErr } = await supabaseClient
                        .from('games')
                        .update(sentinelPayload)
                        .eq('id', existingRows[0].id);

                    if (updErr) {
                        throw new Error('Erro ao atualizar card no Supabase: ' + updErr.message);
                    }
                } else {
                    const { error: insErr } = await supabaseClient
                        .from('games')
                        .insert([sentinelPayload]);

                    if (insErr) {
                        throw new Error('Erro ao salvar card no Supabase: ' + insErr.message);
                    }
                }
            } else if (error) {
                throw new Error('Erro ao salvar card no Supabase: ' + error.message);
            }
        }

        const currentCache = readSpiritLocalCache();
        currentCache[normalized.slug] = normalized;
        const fullList = cloneDefaultSpiritCards().map(def => currentCache[def.slug] ? normalizeSpiritCard(currentCache[def.slug], def) : def);
        writeSpiritLocalCache(fullList);
        return normalized;
    }
};

window.FuriaDataService = FuriaDataService;
