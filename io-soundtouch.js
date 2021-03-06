/*! soundtouch-js 16-06-2015 */
function FifoSampleBuffer() {
    this._vector = new Float32Array, this._position = 0, this._frameCount = 0
}

function extend(a, b) {
    for (var c in b) {
        var d = b.__lookupGetter__(c),
            e = b.__lookupSetter__(c);
        d || e ? (d && a.__defineGetter__(c, d), e && a.__defineSetter__(c, e)) : a[c] = b[c]
    }
    return a
}

function testFloatEqual(a, b) {
    return (a > b ? a - b : b - a) > 1e-10
}

function FilterSupport(a) {
    this._pipe = a
}

function SimpleFilter(a, b) {
    FilterSupport.call(this, b), this.sourceSound = a, this.historyBufferSize = 22050, this._sourcePosition = 0, this.outputBufferPosition = 0, this._position = 0
}

function AbstractFifoSamplePipe(a) {
    a ? (this.inputBuffer = new FifoSampleBuffer, this.outputBuffer = new FifoSampleBuffer) : this.inputBuffer = this.outputBuffer = null
}

function RateTransposer(a) {
    AbstractFifoSamplePipe.call(this, a), this.slopeCount = 0, this.prevSampleL = 0, this.prevSampleR = 0, this.rate = 1
}

function SoundTouch() {
    this.rateTransposer = new RateTransposer(!1), this.tdStretch = new Stretch(!1), this._inputBuffer = new FifoSampleBuffer, this._intermediateBuffer = new FifoSampleBuffer, this._outputBuffer = new FifoSampleBuffer, this._rate = 0, this.tempo = 0, this.virtualPitch = 1, this.virtualRate = 1, this.virtualTempo = 1, this._calculateEffectiveRateAndTempo()
}

function WebAudioBufferSource(a) {
    this.buffer = a
}

function getWebAudioNode(a, b, c) {
    var d = c || 1024,
        e = a.createScriptProcessor ? a.createScriptProcessor(d, 2, 2) : a.createJavascriptNode(d, 2, 2),
        f = new Float32Array(2 * d);
    return e.onaudioprocess = function(a) {
        var c = a.outputBuffer.getChannelData(0),
            g = a.outputBuffer.getChannelData(1),
            h = b.extract(f, d);
        0 === h && e.disconnect();
        for (var i = 0; h > i; i++) c[i] = f[2 * i], g[i] = f[2 * i + 1]
    }, e
}

function Stretch(a) {
    AbstractFifoSamplePipe.call(this, a), this.bQuickSeek = !0, this.bMidBufferDirty = !1, this.pMidBuffer = null, this.overlapLength = 0, this.bAutoSeqSetting = !0, this.bAutoSeekSetting = !0, this._tempo = 1, this.setParameters(44100, DEFAULT_SEQUENCE_MS, DEFAULT_SEEKWINDOW_MS, DEFAULT_OVERLAP_MS)
}

function PitchShifter(a, b, c) {
    this._st = new SoundTouch, this._f = new SimpleFilter(new WebAudioBufferSource(b), this._st, c), this._node = getWebAudioNode(a, this._f)
}
FifoSampleBuffer.prototype = {get vector() {
        return this._vector
    },
    get position() {
        return this._position
    },
    get startIndex() {
        return 2 * this._position
    },
    get frameCount() {
        return this._frameCount
    },
    get endIndex() {
        return 2 * (this._position + this._frameCount)
    },
    clear: function() {
        this.receive(frameCount), this.rewind()
    },
    put: function(a) {
        this._frameCount += a
    },
    putSamples: function(a, b, c) {
        b = b || 0;
        var d = 2 * b;
        c >= 0 || (c = (a.length - d) / 2);
        var e = 2 * c;
        this.ensureCapacity(c + this._frameCount);
        var f = this.endIndex;
        this._vector.set(a.subarray(d, d + e), f), this._frameCount += c
    },
    putBuffer: function(a, b, c) {
        b = b || 0, c >= 0 || (c = a.frameCount - b), this.putSamples(a.vector, a.position + b, c)
    },
    receive: function(a) {
        (!(a >= 0) || a > this._frameCount) && (a = this._frameCount), this._frameCount -= a, this._position += a
    },
    receiveSamples: function(a, b) {
        var c = 2 * b,
            d = this.startIndex;
        a.set(this._vector.subarray(d, d + c)), this.receive(b)
    },
    extract: function(a, b, c) {
        var d = this.startIndex + 2 * b,
            e = 2 * c;
        a.set(this._vector.subarray(d, d + e))
    },
    ensureCapacity: function(a) {
        var b = 2 * a;
        if (this._vector.length < b) {
            var c = new Float32Array(b);
            c.set(this._vector.subarray(this.startIndex, this.endIndex)), this._vector = c, this._position = 0
        } else this.rewind()
    },
    ensureAdditionalCapacity: function(a) {
        this.ensureCapacity(this.frameCount + a)
    },
    rewind: function() {
        this._position > 0 && (this._vector.set(this._vector.subarray(this.startIndex, this.endIndex)), this._position = 0)
    }
}, FilterSupport.prototype = {get pipe() {
        return this._pipe
    },
    get inputBuffer() {
        return this._pipe.inputBuffer
    },
    get outputBuffer() {
        return this._pipe.outputBuffer
    },
    fillOutputBuffer: function(a) {
        for (; this.outputBuffer.frameCount < a;) {
            var b = 16384 - this.inputBuffer.frameCount;
            if (this.fillInputBuffer(b), this.inputBuffer.frameCount < 16384) break;
            this._pipe.process()
        }
    },
    clear: function() {
        this._pipe.clear()
    }
}, extend(SimpleFilter.prototype, FilterSupport.prototype), extend(SimpleFilter.prototype, {get position() {
        return this._position
    },
    set position(a) {
        if (a > this._position) throw new RangeError("New position may not be greater than current position");
        var b = this.outputBufferPosition - (this._position - a);
        if (0 > b) throw new RangeError("New position falls outside of history buffer");
        this.outputBufferPosition = b, this._position = a
    },
    get sourcePosition() {
        return this._sourcePosition
    },
    set sourcePosition(a) {
        this.clear(), this._sourcePosition = a
    },
    fillInputBuffer: function(a) {
        var b = new Float32Array(2 * a),
            c = this.sourceSound.extract(b, a, this._sourcePosition);
        this._sourcePosition += c, this.inputBuffer.putSamples(b, 0, c)
    },
    extract: function(a, b) {
        this.fillOutputBuffer(this.outputBufferPosition + b);
        var c = Math.min(b, this.outputBuffer.frameCount - this.outputBufferPosition);
        this.outputBuffer.extract(a, this.outputBufferPosition, c);
        var d = this.outputBufferPosition + c;
        return this.outputBufferPosition = Math.min(this.historyBufferSize, d), this.outputBuffer.receive(Math.max(d - this.historyBufferSize, 0)), this._position += c, c
    },
    handleSampleData: function(a) {
        this.extract(a.data, 4096)
    },
    clear: function() {
        FilterSupport.prototype.clear.call(this), this.outputBufferPosition = 0
    }
}), AbstractFifoSamplePipe.prototype = {get inputBuffer() {
        return this._inputBuffer
    },
    set inputBuffer(a) {
        this._inputBuffer = a
    },
    get outputBuffer() {
        return this._outputBuffer
    },
    set outputBuffer(a) {
        this._outputBuffer = a
    },
    clear: function() {
        this._inputBuffer.clear(), this._outputBuffer.clear()
    }
}, extend(RateTransposer.prototype, AbstractFifoSamplePipe.prototype), extend(RateTransposer.prototype, {set rate(a) {
        this._rate = a
    },
    _reset: function() {
        this.slopeCount = 0, this.prevSampleL = 0, this.prevSampleR = 0
    },
    clone: function() {
        var a = new RateTransposer;
        return a.rate = this._rate, a
    },
    process: function() {
        var a = this._inputBuffer.frameCount;
        this._outputBuffer.ensureAdditionalCapacity(a / this._rate + 1);
        var b = this._transpose(a);
        this._inputBuffer.receive(), this._outputBuffer.put(b)
    },
    _transpose: function(a) {
        if (0 == a) return 0;
        for (var b = this._inputBuffer.vector, c = this._inputBuffer.startIndex, d = this._outputBuffer.vector, e = this._outputBuffer.endIndex, f = 0, g = 0; this.slopeCount < 1;) d[e + 2 * g] = (1 - this.slopeCount) * this.prevSampleL + this.slopeCount * b[c], d[e + 2 * g + 1] = (1 - this.slopeCount) * this.prevSampleR + this.slopeCount * b[c + 1], g++, this.slopeCount += this._rate;
        if (this.slopeCount -= 1, 1 != a) a: for (;;) {
            for (; this.slopeCount > 1;)
                if (this.slopeCount -= 1, f++, f >= a - 1) break a;
            var h = c + 2 * f;
            d[e + 2 * g] = (1 - this.slopeCount) * b[h] + this.slopeCount * b[h + 2], d[e + 2 * g + 1] = (1 - this.slopeCount) * b[h + 1] + this.slopeCount * b[h + 3], g++, this.slopeCount += this._rate
        }
        return this.prevSampleL = b[c + 2 * a - 2], this.prevSampleR = b[c + 2 * a - 1], g
    }
}), extend(SoundTouch.prototype, {
    clear: function() {
        rateTransposer.clear(), tdStretch.clear()
    },
    clone: function() {
        var a = new SoundTouch;
        return a.rate = rate, a.tempo = tempo, a
    },
    get rate() {
        return this._rate
    },
    set rate(a) {
        this.virtualRate = a, this._calculateEffectiveRateAndTempo()
    },
    set rateChange(a) {
        this.rate = 1 + .01 * a
    },
    get tempo() {
        return this._tempo
    },
    set tempo(a) {
        this.virtualTempo = a, this._calculateEffectiveRateAndTempo()
    },
    set tempoChange(a) {
        this.tempo = 1 + .01 * a
    },
    set pitch(a) {
        this.virtualPitch = a, this._calculateEffectiveRateAndTempo()
    },
    set pitchOctaves(a) {
        this.pitch = Math.exp(.69314718056 * a), this._calculateEffectiveRateAndTempo()
    },
    set pitchSemitones(a) {
        this.pitchOctaves = a / 12
    },
    get inputBuffer() {
        return this._inputBuffer
    },
    get outputBuffer() {
        return this._outputBuffer
    },
    _calculateEffectiveRateAndTempo: function() {
        console.log("calculating");
        var a = this._tempo,
            b = this._rate;
        this._tempo = this.virtualTempo / this.virtualPitch, this._rate = this.virtualRate * this.virtualPitch, testFloatEqual(this._tempo, a) && (this.tdStretch.tempo = this._tempo), testFloatEqual(this._rate, b) && (this.rateTransposer.rate = this._rate), this._rate > 1 ? this._outputBuffer != this.rateTransposer.outputBuffer && (this.tdStretch.inputBuffer = this._inputBuffer, this.tdStretch.outputBuffer = this._intermediateBuffer, this.rateTransposer.inputBuffer = this._intermediateBuffer, this.rateTransposer.outputBuffer = this._outputBuffer) : this._outputBuffer != this.tdStretch.outputBuffer && (this.rateTransposer.inputBuffer = this._inputBuffer, this.rateTransposer.outputBuffer = this._intermediateBuffer, this.tdStretch.inputBuffer = this._intermediateBuffer, this.tdStretch.outputBuffer = this._outputBuffer)
    },
    process: function() {
        this._rate > 1 ? (this.tdStretch.process(), this.rateTransposer.process()) : (this.rateTransposer.process(), this.tdStretch.process())
    }
}), WebAudioBufferSource.prototype = {
    extract: function(a, b, c) {
        var d, e = this.buffer.getChannelData(0);
        buffer.numberOfChannels > 1 && (d = this.buffer.getChannelData(1));
        for (var f = 0; b > f; f++) a[2 * f] = e[f + c], buffer.numberOfChannels > 1 && (a[2 * f + 1] = d[f + c]);
        return Math.min(b, e.length - c)
    }
};
var USE_AUTO_SEQUENCE_LEN = 0,
    DEFAULT_SEQUENCE_MS = USE_AUTO_SEQUENCE_LEN,
    USE_AUTO_SEEKWINDOW_LEN = 0,
    DEFAULT_SEEKWINDOW_MS = USE_AUTO_SEEKWINDOW_LEN,
    DEFAULT_OVERLAP_MS = 8,
    _SCAN_OFFSETS = [
        [124, 186, 248, 310, 372, 434, 496, 558, 620, 682, 744, 806, 868, 930, 992, 1054, 1116, 1178, 1240, 1302, 1364, 1426, 1488, 0],
        [-100, -75, -50, -25, 25, 50, 75, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [-20, -15, -10, -5, 5, 10, 15, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [-4, -3, -2, -1, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    AUTOSEQ_TEMPO_LOW = .5,
    AUTOSEQ_TEMPO_TOP = 2,
    AUTOSEQ_AT_MIN = 125,
    AUTOSEQ_AT_MAX = 50,
    AUTOSEQ_K = (AUTOSEQ_AT_MAX - AUTOSEQ_AT_MIN) / (AUTOSEQ_TEMPO_TOP - AUTOSEQ_TEMPO_LOW),
    AUTOSEQ_C = AUTOSEQ_AT_MIN - AUTOSEQ_K * AUTOSEQ_TEMPO_LOW,
    AUTOSEEK_AT_MIN = 25,
    AUTOSEEK_AT_MAX = 15,
    AUTOSEEK_K = (AUTOSEEK_AT_MAX - AUTOSEEK_AT_MIN) / (AUTOSEQ_TEMPO_TOP - AUTOSEQ_TEMPO_LOW),
    AUTOSEEK_C = AUTOSEEK_AT_MIN - AUTOSEEK_K * AUTOSEQ_TEMPO_LOW;
extend(Stretch.prototype, AbstractFifoSamplePipe.prototype), extend(Stretch.prototype, {
    clear: function() {
        AbstractFifoSamplePipe.prototype.clear.call(this), this._clearMidBuffer()
    },
    _clearMidBuffer: function() {
        this.bMidBufferDirty && (this.bMidBufferDirty = !1, this.pMidBuffer = null)
    },
    setParameters: function(a, b, c, d) {
        a > 0 && (this.sampleRate = a), d > 0 && (this.overlapMs = d), b > 0 ? (this.sequenceMs = b, this.bAutoSeqSetting = !1) : this.bAutoSeqSetting = !0, c > 0 ? (this.seekWindowMs = c, this.bAutoSeekSetting = !1) : this.bAutoSeekSetting = !0, this.calcSeqParameters(), this.calculateOverlapLength(this.overlapMs), this.tempo = this._tempo
    },
    set tempo(a) {
        var b;
        this._tempo = a, this.calcSeqParameters(), this.nominalSkip = this._tempo * (this.seekWindowLength - this.overlapLength), this.skipFract = 0, b = Math.floor(this.nominalSkip + .5), this.sampleReq = Math.max(b + this.overlapLength, this.seekWindowLength) + this.seekLength
    },
    get inputChunkSize() {
        return this.sampleReq
    },
    get outputChunkSize() {
        return this.overlapLength + Math.max(0, this.seekWindowLength - 2 * this.overlapLength)
    },
    calculateOverlapLength: function(a) {
        var b;
        b = this.sampleRate * a / 1e3, 16 > b && (b = 16), b -= b % 8, this.overlapLength = b, this.pRefMidBuffer = new Float32Array(2 * this.overlapLength), this.pMidBuffer = new Float32Array(2 * this.overlapLength)
    },
    checkLimits: function(a, b, c) {
        return b > a ? b : a > c ? c : a
    },
    calcSeqParameters: function() {
        var a, b;
        this.bAutoSeqSetting && (a = AUTOSEQ_C + AUTOSEQ_K * this._tempo, a = this.checkLimits(a, AUTOSEQ_AT_MAX, AUTOSEQ_AT_MIN), this.sequenceMs = Math.floor(a + .5)), this.bAutoSeekSetting && (b = AUTOSEEK_C + AUTOSEEK_K * this._tempo, b = this.checkLimits(b, AUTOSEEK_AT_MAX, AUTOSEEK_AT_MIN), this.seekWindowMs = Math.floor(b + .5)), this.seekWindowLength = Math.floor(this.sampleRate * this.sequenceMs / 1e3), this.seekLength = Math.floor(this.sampleRate * this.seekWindowMs / 1e3)
    },
    set quickSeek(a) {
        this.bQuickSeek = a
    },
    clone: function() {
        var a = new Stretch;
        return a.tempo = this.tempo, a.setParameters(this.sampleRate, this.sequenceMs, this.seekWindowMs, this.overlapMs), a
    },
    seekBestOverlapPosition: function() {
        return this.bQuickSeek ? this.seekBestOverlapPositionStereoQuick() : this.seekBestOverlapPositionStereo()
    },
    seekBestOverlapPositionStereo: function() {
        var a, b, c, d;
        for (this.precalcCorrReferenceStereo(), b = Number.MIN_VALUE, a = 0, d = 0; d < this.seekLength; d++) c = this.calcCrossCorrStereo(2 * d, this.pRefMidBuffer), c > b && (b = c, a = d);
        return a
    },
    seekBestOverlapPositionStereoQuick: function() {
        var a, b, c, d, e, f, g;
        for (this.precalcCorrReferenceStereo(), c = Number.MIN_VALUE, b = 0, f = 0, g = 0, e = 0; 4 > e; e++) {
            for (a = 0; _SCAN_OFFSETS[e][a] && (g = f + _SCAN_OFFSETS[e][a], !(g >= this.seekLength));) d = this.calcCrossCorrStereo(2 * g, this.pRefMidBuffer), d > c && (c = d, b = g), a++;
            f = b
        }
        return b
    },
    precalcCorrReferenceStereo: function() {
        var a, b, c;
        for (a = 0; a < this.overlapLength; a++) c = a * (this.overlapLength - a), b = 2 * a, this.pRefMidBuffer[b] = this.pMidBuffer[b] * c, this.pRefMidBuffer[b + 1] = this.pMidBuffer[b + 1] * c
    },
    calcCrossCorrStereo: function(a, b) {
        var c = this._inputBuffer.vector;
        a += this._inputBuffer.startIndex;
        var d, e, f;
        for (d = 0, e = 2; e < 2 * this.overlapLength; e += 2) f = e + a, d += c[f] * b[e] + c[f + 1] * b[e + 1];
        return d
    },
    overlap: function(a) {
        this.overlapStereo(2 * a)
    },
    overlapStereo: function(a) {
        var b = this._inputBuffer.vector;
        a += this._inputBuffer.startIndex;
        var c, d, e, f, g, h, i, j = this._outputBuffer.vector,
            k = this._outputBuffer.endIndex;
        for (f = 1 / this.overlapLength, c = 0; c < this.overlapLength; c++) e = (this.overlapLength - c) * f, g = c * f, d = 2 * c, h = d + a, i = d + k, j[i + 0] = b[h + 0] * g + this.pMidBuffer[d + 0] * e, j[i + 1] = b[h + 1] * g + this.pMidBuffer[d + 1] * e
    },
    process: function() {
        var a, b, c;
        if (null == this.pMidBuffer) {
            if (this._inputBuffer.frameCount < this.overlapLength) return;
            this.pMidBuffer = new Float32Array(2 * this.overlapLength), this._inputBuffer.receiveSamples(this.pMidBuffer, this.overlapLength)
        }
        for (; this._inputBuffer.frameCount >= this.sampleReq;) {
            b = this.seekBestOverlapPosition(), this._outputBuffer.ensureAdditionalCapacity(this.overlapLength), this.overlap(Math.floor(b)), this._outputBuffer.put(this.overlapLength), c = this.seekWindowLength - 2 * this.overlapLength, c > 0 && this._outputBuffer.putBuffer(this._inputBuffer, b + this.overlapLength, c);
            var d = this.inputBuffer.startIndex + 2 * (b + this.seekWindowLength - this.overlapLength);
            this.pMidBuffer.set(this._inputBuffer.vector.subarray(d, d + 2 * this.overlapLength)), this.skipFract += this.nominalSkip, a = Math.floor(this.skipFract), this.skipFract -= a, this._inputBuffer.receive(a)
        }
    }
}), extend(Stretch.prototype, {get tempo() {
        return this._tempo
    }
}), PitchShifter.prototype.connect = function(a) {
    this._node.connect(a)
}, PitchShifter.prototype.disconnect = function(a) {
    this._node.disconnect()
}, extend(PitchShifter.prototype, {set pitch(a) {
        this._st.pitch = a
    },
    set rate(a) {
        this._st.rate = a
    },
    set tempo(a) {
        this._st.tempo = a
    }
});
