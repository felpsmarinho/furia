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
        return (data || []).map(mapDbRowToGame);
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
    }
};

window.FuriaDataService = FuriaDataService;
