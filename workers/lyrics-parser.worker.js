/**
 * LYRICFLOW v1.3 - LYRICS PARSER WORKER
 * Parse and process lyrics off-main-thread
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'parseLRC':
            parseLRC(data);
            break;
        case 'parsePlain':
            parsePlain(data);
            break;
        case 'sync':
            performSync(data);
            break;
        case 'translate':
            translateLyrics(data);
            break;
        case 'romanize':
            romanizeText(data);
            break;
    }
};

function parseLRC(content) {
    const lines = content.split('\n');
    const result = [];
    
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        const timeMatches = [...line.matchAll(timeRegex)];
        
        if (timeMatches.length > 0) {
            const text = line.replace(timeRegex, '').trim();
            
            timeMatches.forEach(match => {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3].padEnd(3, '0'));
                
                const time = minutes * 60 + seconds + milliseconds / 1000;
                
                result.push({
                    time,
                    text,
                    originalText: text
                });
            });
        }
    });
    
    result.sort((a, b) => a.time - b.time);
    
    self.postMessage({
        type: 'parsed',
        lyrics: result
    });
}

function parsePlain(content) {
    const lines = content.split('\n').filter(l => l.trim());
    
    const result = lines.map((text, index) => ({
        time: index * 5, // Estimate 5 seconds per line
        text: text.trim(),
        originalText: text.trim(),
        estimated: true
    }));
    
    self.postMessage({
        type: 'parsed',
        lyrics: result
    });
}

function performSync({ lyrics, audioFeatures }) {
    // Use audio features to improve sync
    const { onsets, beats } = audioFeatures;
    
    const synced = lyrics.map((line, index) => {
        // Find nearest onset or beat
        const targetTime = line.time;
        const nearestOnset = findNearest(onsets, targetTime);
        
        return {
            ...line,
            time: nearestOnset || line.time,
            confidence: nearestOnset ? 1 : 0.5
        };
    });
    
    self.postMessage({
        type: 'synced',
        lyrics: synced
    });
}

function findNearest(array, target) {
    if (!array || array.length === 0) return null;
    
    return array.reduce((prev, curr) => {
        return Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev;
    });
}

function translateLyrics({ lyrics, targetLang }) {
    // This would call a translation API
    // For demo, return mock translation
    
    const translations = {
        'id': {
            'hello': 'halo',
            'love': 'cinta',
            'heart': 'hati'
        }
    };
    
    const dict = translations[targetLang] || {};
    
    const translated = lyrics.map(line => ({
        ...line,
        translation: line.text.split(' ').map(word => {
            return dict[word.toLowerCase()] || word;
        }).join(' ')
    }));
    
    self.postMessage({
        type: 'translated',
        lyrics: translated
    });
}

function romanizeText({ text, sourceLang }) {
    // Romanization for non-Latin scripts
    const romanizations = {
        'ja': {
            // Simple kana to romaji mapping
            'こんにちは': 'konnichiwa',
            'ありがとう': 'arigatou'
        },
        'ko': {
            // Simple hangul to romaja
            '안녕하세요': 'annyeonghaseyo',
            '감사합니다': 'gamsahamnida'
        }
    };
    
    const map = romanizations[sourceLang];
    if (!map) {
        self.postMessage({ type: 'romanized', text });
        return;
    }
    
    let result = text;
    for (const [original, romanized] of Object.entries(map)) {
        result = result.replace(new RegExp(original, 'g'), romanized);
    }
    
    self.postMessage({
        type: 'romanized',
        text: result
    });
}
