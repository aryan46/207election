import React, { useState, useEffect } from 'react';
import { Vote, User, Shield, Upload, FileText, Mail, Lock, CheckCircle, BarChart3, Download, Users, Power, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const VotingPlatform = () => {
    const [view, setView] = useState('home');
    const [user, setUser] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [voters, setVoters] = useState([]); // Used for admin stats mainly
    const [votingEnabled, setVotingEnabled] = useState(true);
    const [hasVoted, setHasVoted] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Registration form states
    const [voterForm, setVoterForm] = useState({ email: '', password: '' });
    const [voterVerified, setVoterVerified] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(false);

    // Candidate Form
    const [candidateForm, setCandidateForm] = useState({
        email: '',
        name: '',
        ideology: '',
        manifesto: '',
        symbol: '',
        image: null
    });

    // Admin states
    const [adminAuth, setAdminAuth] = useState({ email: '', password: '' });
    const [isAdmin, setIsAdmin] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        fetchCandidates();
        fetchVotingStatus();
    }, []);

    // Also fetch when admin view loads to get stats
    useEffect(() => {
        if (view === 'admin') {
            fetchStats();
        }
    }, [view]);

    const fetchCandidates = async () => {
        try {
            const res = await fetch(`${API_URL}/candidates`);
            const data = await res.json();
            setCandidates(data);
        } catch (err) {
            console.error("Failed to fetch candidates", err);
        }
    };

    const fetchVotingStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/config/voting`);
            const data = await res.json();
            setVotingEnabled(data.enabled);
        } catch (err) {
            console.error("Failed to fetch voting status", err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/stats`);
            const data = await res.json();
            setVoters(data.voters || []);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    };

    const handleVoterRegistration = async () => {
        if (!voterForm.email || !voterForm.password) {
            alert('Please enter both email and password');
            return;
        }
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(voterForm)
            });
            const data = await res.json();

            if (res.ok) {
                setVoterVerified(true);
                setUser(data);
                setTimeout(() => setView('vote'), 1500);
            } else {
                if (res.status === 409) {
                    alert(data.error + '. Please login instead.');
                    setIsLoginMode(true);
                } else {
                    alert(data.error);
                }
            }
        } catch (err) {
            alert('Registration failed');
        }
    };

    const handleVoterLogin = async () => {
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(voterForm)
            });
            const data = await res.json();

            if (res.ok) {
                setUser(data);
                if (data.hasVoted) setHasVoted(true);
                setVoterVerified(true);
                setTimeout(() => setView('vote'), 1500);
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Login failed');
        }
    };

    const handleCandidateRegistration = async () => {
        if (!candidateForm.email || !candidateForm.name || !candidateForm.ideology || !candidateForm.manifesto || !candidateForm.symbol) {
            alert('Please fill all fields');
            return;
        }

        const formData = new FormData();
        formData.append('email', candidateForm.email);
        formData.append('name', candidateForm.name);
        formData.append('ideology', candidateForm.ideology);
        formData.append('manifesto', candidateForm.manifesto);
        formData.append('symbol', candidateForm.symbol);
        if (candidateForm.image) {
            formData.append('image', candidateForm.image);
        }

        try {
            const res = await fetch(`${API_URL}/candidates`, {
                method: 'POST',
                body: formData // No Content-Type header needed, browser sets it for FormData
            });
            if (res.ok) {
                alert('Candidate registered successfully!');
                setCandidateForm({ email: '', name: '', ideology: '', manifesto: '', symbol: '', image: null });
                fetchCandidates(); // Refresh list
            } else {
                alert('Failed to register candidate');
            }
        } catch (err) {
            alert('Error registering candidate');
        }
    };

    const handleDeleteCandidate = async (id) => {
        if (confirm('Are you sure you want to delete this candidate?')) {
            try {
                await fetch(`${API_URL}/candidates/${id}`, { method: 'DELETE' });
                fetchCandidates();
            } catch (err) {
                alert('Failed to delete');
            }
        }
    };

    const handleVote = async (candidateId) => {
        if (!votingEnabled) {
            alert('Voting is currently disabled');
            return;
        }
        if (user?.hasVoted || hasVoted) {
            alert('You have already cast your vote');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidateId, voterEmail: user.email })
            });

            if (res.ok) {
                setHasVoted(true);
                setUser({ ...user, hasVoted: true });
                setShowConfirmation(true);
                // Optimistic update
                setCandidates(candidates.map(c => c.id === candidateId ? { ...c, votes: c.votes + 1 } : c));
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (err) {
            alert('Voting failed');
        }
    };

    const handleToggleVoting = async () => {
        const newState = !votingEnabled;
        try {
            await fetch(`${API_URL}/config/voting`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: newState })
            });
            setVotingEnabled(newState);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAdminLogin = () => {
        if (adminAuth.email === 'admin@207.com' && adminAuth.password === 'admin207') {
            setIsAdmin(true);
            setView('admin');
        } else {
            alert('Invalid credentials');
        }
    };

    const exportResults = () => {
        const csv = [
            ['Candidate', 'Votes', 'Email', 'Ideology'],
            ...candidates.map(c => [c.name, c.votes, c.email, c.ideology])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '207-election-results.csv';
        a.click();
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 relative overflow-hidden">
            {/* Atmosphere and Grain layers retained */}
            <div className="fixed inset-0 opacity-30">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-zinc-950 to-emerald-950/40"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
            </div>
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")' }}>
            </div>

            <div className="relative z-10">
                <nav className="border-b border-zinc-800/50 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-sm flex items-center justify-center">
                                <Vote className="w-6 h-6 text-zinc-950" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-serif tracking-tight">207 Election</h1>
                                <p className="text-xs text-zinc-500 tracking-wider uppercase">Democratic Process</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setView('home')} className="px-4 py-2 text-sm hover:text-amber-400 transition-colors">Home</button>
                            <button onClick={() => setView('register-voter')} className="px-4 py-2 text-sm hover:text-amber-400 transition-colors">Register to Vote</button>
                            <button onClick={() => setView('register-candidate')} className="px-4 py-2 text-sm hover:text-amber-400 transition-colors">Register Candidate</button>
                            <button onClick={() => setView('admin-login')} className="px-4 py-2 text-sm text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Admin
                            </button>
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto px-6 py-16">
                    {view === 'home' && (
                        <div className="space-y-16">
                            <div className="max-w-3xl">
                                <h2 className="text-7xl font-serif tracking-tight leading-none mb-6 bg-gradient-to-r from-amber-300 via-amber-100 to-emerald-300 bg-clip-text text-transparent">
                                    Your voice shapes tomorrow
                                </h2>
                                <p className="text-xl text-zinc-400 leading-relaxed font-light">
                                    The 207 Election represents a commitment to transparent, accessible democratic participation. Every vote counts. Every voice matters.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-8">
                                <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 backdrop-blur-sm hover:border-amber-600/50 transition-all duration-300">
                                    <User className="w-10 h-10 text-amber-500 mb-4" />
                                    <h3 className="text-xl font-serif mb-3">Register & Vote</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">Secure registration ensures one vote per citizen.</p>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 backdrop-blur-sm hover:border-emerald-600/50 transition-all duration-300">
                                    <FileText className="w-10 h-10 text-emerald-500 mb-4" />
                                    <h3 className="text-xl font-serif mb-3">Informed Decisions</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">Access complete manifestos and platforms.</p>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 backdrop-blur-sm hover:border-zinc-400/50 transition-all duration-300">
                                    <Shield className="w-10 h-10 text-zinc-400 mb-4" />
                                    <h3 className="text-xl font-serif mb-3">Transparent Process</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">Real-time monitoring and secure data handling.</p>
                                </div>
                            </div>

                            {votingEnabled && (
                                <div className="bg-gradient-to-r from-amber-900/20 to-emerald-900/20 border border-amber-600/30 p-8 rounded-sm">
                                    <div className="flex items-center gap-4 mb-4">
                                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                                        <h3 className="text-2xl font-serif">Voting is Open</h3>
                                    </div>
                                    <button onClick={() => setView('register-voter')} className="bg-amber-600 hover:bg-amber-500 text-zinc-950 px-8 py-3 font-medium transition-colors">
                                        Begin Registration
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'register-voter' && (
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-5xl font-serif mb-8">{isLoginMode ? 'Voter Login' : 'Voter Registration'}</h2>
                            {!voterVerified ? (
                                <div className="space-y-6 bg-zinc-900/40 border border-zinc-800/50 p-10 backdrop-blur-sm">
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                            <input
                                                type="email"
                                                value={voterForm.email}
                                                onChange={(e) => setVoterForm({ ...voterForm, email: e.target.value })}
                                                className="w-full bg-zinc-950 border border-zinc-700 pl-12 pr-4 py-4 focus:outline-none focus:border-amber-600 transition-colors text-zinc-100"
                                                placeholder="your.email@example.com"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                            <input
                                                type="password"
                                                value={voterForm.password}
                                                onChange={(e) => setVoterForm({ ...voterForm, password: e.target.value })}
                                                className="w-full bg-zinc-950 border border-zinc-700 pl-12 pr-4 py-4 focus:outline-none focus:border-amber-600 transition-colors text-zinc-100"
                                                placeholder={isLoginMode ? "Enter your password" : "Create a password"}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={isLoginMode ? handleVoterLogin : handleVoterRegistration}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 py-4 font-medium transition-colors"
                                    >
                                        {isLoginMode ? 'Login to Vote' : 'Register & Verify'}
                                    </button>

                                    <div className="text-center pt-4 border-t border-zinc-800">
                                        <button
                                            onClick={() => setIsLoginMode(!isLoginMode)}
                                            className="text-sm text-zinc-400 hover:text-amber-400 transition-colors"
                                        >
                                            {isLoginMode ? "Don't have an account? Register here." : "Already have an account? Login here."}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-900/20 border border-emerald-600/30 p-10 text-center">
                                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                                    <h3 className="text-2xl font-serif mb-3">Success</h3>
                                    <p className="text-zinc-300">Redirecting to voting page...</p>
                                    <button
                                        onClick={() => setView('vote')}
                                        className="mt-4 px-6 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-full text-sm font-medium transition-colors"
                                    >
                                        Click here if not redirected
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'vote' && (
                        <div className="max-w-4xl mx-auto">
                            <h2 className="text-5xl font-serif mb-12">Cast Your Vote</h2>

                            {showConfirmation ? (
                                <div className="bg-emerald-900/20 border border-emerald-600/30 p-12 text-center">
                                    <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
                                    <h3 className="text-3xl font-serif mb-4">Vote Recorded Successfully</h3>
                                    <p className="text-xl text-zinc-300 mb-6">Thank you for participating. Your vote has been securely recorded.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {candidates.length === 0 && (
                                        <div className="bg-zinc-900/40 border border-zinc-800/50 p-12 text-center text-zinc-500">
                                            No candidates registered yet.
                                        </div>
                                    )}
                                    {candidates.map((candidate) => (
                                        <div key={candidate.id} className="bg-zinc-900/40 border border-zinc-800/50 p-8 backdrop-blur-sm hover:border-amber-600/50 transition-all duration-300">
                                            <div className="flex items-start gap-6">
                                                {candidate.image ? (
                                                    <img src={`${API_URL.replace('/api', '')}${candidate.image}`} alt={candidate.name} className="w-24 h-24 object-cover rounded-md border border-zinc-700" />
                                                ) : (
                                                    <div className="text-6xl">{candidate.symbol}</div>
                                                )}
                                                <div className="flex-1">
                                                    <h3 className="text-2xl font-serif mb-2">{candidate.name}</h3>
                                                    <p className="text-sm text-zinc-500 mb-4">{candidate.email}</p>
                                                    <p className="text-zinc-300 mb-4 leading-relaxed">{candidate.ideology}</p>
                                                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                                                        <FileText className="w-4 h-4" />
                                                        <span>Manifesto: {candidate.manifesto}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleVote(candidate.id)}
                                                    disabled={hasVoted}
                                                    className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-zinc-950 px-8 py-3 font-medium transition-colors whitespace-nowrap"
                                                >
                                                    {hasVoted ? 'Voted' : 'Vote'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'register-candidate' && (
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-5xl font-serif mb-8">Candidate Registration</h2>
                            <div className="space-y-6 bg-zinc-900/40 border border-zinc-800/50 p-10 backdrop-blur-sm">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Email Address</label>
                                    <input
                                        type="email"
                                        value={candidateForm.email}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-700 px-4 py-4 focus:outline-none focus:border-amber-600 transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Candidate/Party Name</label>
                                    <input
                                        type="text"
                                        value={candidateForm.name}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-700 px-4 py-4 focus:outline-none focus:border-amber-600 transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Political Ideology</label>
                                    <textarea
                                        value={candidateForm.ideology}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, ideology: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-700 px-4 py-4 focus:outline-none focus:border-amber-600 transition-colors h-32 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Party Image (Optional)</label>
                                    <div className="relative">
                                        <Upload className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setCandidateForm({ ...candidateForm, image: e.target.files[0] })}
                                            className="w-full bg-zinc-950 border border-zinc-700 pl-12 pr-4 py-4 focus:outline-none focus:border-amber-600 transition-colors text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-600 file:text-zinc-950 hover:file:bg-amber-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Party Symbol (Emoji)</label>
                                    <input
                                        type="text"
                                        value={candidateForm.symbol}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, symbol: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-700 px-4 py-4 focus:outline-none focus:border-amber-600 transition-colors"
                                        placeholder="🌟"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Manifesto Summary</label>
                                    <textarea
                                        value={candidateForm.manifesto}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-700 px-4 py-4 focus:outline-none focus:border-amber-600 transition-colors h-24 resize-none"
                                    />
                                </div>
                                <button onClick={handleCandidateRegistration} className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 py-4 font-medium transition-colors">
                                    Submit Registration
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'admin-login' && !isAdmin && (
                        <div className="max-w-md mx-auto">
                            <h2 className="text-5xl font-serif mb-8">Admin Access</h2>
                            <div className="space-y-6 bg-zinc-900/40 border border-zinc-800/50 p-10 backdrop-blur-sm">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Admin Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input
                                            type="email"
                                            value={adminAuth.email}
                                            onChange={(e) => setAdminAuth({ ...adminAuth, email: e.target.value })}
                                            className="w-full bg-zinc-950 border border-zinc-700 pl-12 pr-4 py-4 focus:outline-none focus:border-emerald-600 transition-colors"
                                            placeholder="admin@207.com"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 tracking-wide uppercase">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input
                                            type="password"
                                            value={adminAuth.password}
                                            onChange={(e) => setAdminAuth({ ...adminAuth, password: e.target.value })}
                                            className="w-full bg-zinc-950 border border-zinc-700 pl-12 pr-4 py-4 focus:outline-none focus:border-emerald-600 transition-colors"
                                            placeholder="Enter admin password"
                                            required
                                        />
                                    </div>
                                </div>
                                <button onClick={handleAdminLogin} className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 py-4 font-medium transition-colors">
                                    Login
                                </button>

                            </div>
                        </div>
                    )}

                    {view === 'admin' && isAdmin && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-5xl font-serif">Admin Dashboard</h2>
                                <div className="flex gap-3">
                                    <button onClick={exportResults} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-6 py-3 transition-colors">
                                        <Download className="w-4 h-4" />
                                        Export Results
                                    </button>
                                    <button
                                        onClick={handleToggleVoting}
                                        className={`flex items-center gap-2 px-6 py-3 transition-colors ${votingEnabled ? 'bg-red-900/50 hover:bg-red-900' : 'bg-emerald-900/50 hover:bg-emerald-900'}`}
                                    >
                                        <Power className="w-4 h-4" />
                                        {votingEnabled ? 'Disable Voting' : 'Enable Voting'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 backdrop-blur-sm">
                                    <BarChart3 className="w-8 h-8 text-amber-500 mb-3" />
                                    <div className="text-3xl font-serif mb-1">{candidates.reduce((sum, c) => sum + c.votes, 0)}</div>
                                    <div className="text-sm text-zinc-500 tracking-wide uppercase">Total Votes</div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 backdrop-blur-sm">
                                    <Users className="w-8 h-8 text-emerald-500 mb-3" />
                                    <div className="text-3xl font-serif mb-1">{voters.length}</div>
                                    <div className="text-sm text-zinc-500 tracking-wide uppercase">Registered Voters</div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 backdrop-blur-sm">
                                    <Vote className="w-8 h-8 text-zinc-400 mb-3" />
                                    <div className="text-3xl font-serif mb-1">{candidates.length}</div>
                                    <div className="text-sm text-zinc-500 tracking-wide uppercase">Candidates</div>
                                </div>
                            </div>

                            <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 backdrop-blur-sm">
                                <h3 className="text-2xl font-serif mb-6">Vote Distribution</h3>
                                <div className="space-y-4">
                                    {candidates.map((candidate) => {
                                        const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
                                        const percentage = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
                                        return (
                                            <div key={candidate.id} className="group relative">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-medium flex items-center gap-3">
                                                        {candidate.image && (
                                                            <img src={`${API_URL.replace('/api', '')}${candidate.image}`} alt={candidate.name} className="w-8 h-8 object-cover rounded-full border border-zinc-700" />
                                                        )}
                                                        {candidate.name}
                                                        <button
                                                            onClick={() => handleDeleteCandidate(candidate.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-opacity"
                                                            title="Delete Candidate"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </span>
                                                    <span className="text-zinc-400">{candidate.votes} votes ({percentage.toFixed(1)}%)</span>
                                                </div>
                                                <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {candidates.length === 0 && <p className="text-zinc-500 text-center">No candidates registered</p>}
                                </div>
                            </div>

                            <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 backdrop-blur-sm">
                                <h3 className="text-2xl font-serif mb-6">Registered Voters</h3>
                                <div className="space-y-2">
                                    {voters.map((voter, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-3 border-b border-zinc-800/50">
                                            <span className="text-zinc-300">{voter.email}</span>
                                            <span className={`text-sm px-3 py-1 rounded-full ${voter.hasVoted ? 'bg-emerald-900/30 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {voter.hasVoted ? 'Voted' : 'Not Voted'}
                                            </span>
                                        </div>
                                    ))}
                                    {voters.length === 0 && <p className="text-zinc-500 text-center py-6">No registered voters yet</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default VotingPlatform;
