import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceSearchProps {
    onResult?: (transcript: string) => void;
    language?: string;
    continuous?: boolean;
}

interface UseVoiceSearchReturn {
    isListening: boolean;
    transcript: string;
    error: string | null;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
}

export const useVoiceSearch = ({
    onResult,
    language = 'en-IN',
    continuous = false
}: UseVoiceSearchProps = {}): UseVoiceSearchReturn => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

    // Use ref to store the latest onResult callback without causing re-renders
    const onResultRef = useRef(onResult);

    useEffect(() => {
        onResultRef.current = onResult;
    }, [onResult]);

    // Check if browser supports Web Speech API
    const isSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    useEffect(() => {
        if (!isSupported) {
            setError('Voice search is not supported in this browser');
            return;
        }

        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognitionInstance = new SpeechRecognition();

        recognitionInstance.continuous = continuous;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = language;

        // Handle results
        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPiece = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptPiece + ' ';
                } else {
                    interimTranscript += transcriptPiece;
                }
            }

            const fullTranscript = (finalTranscript + interimTranscript).trim();
            setTranscript(fullTranscript);

            if (finalTranscript && onResultRef.current) {
                onResultRef.current(finalTranscript.trim());
            }
        };

        // Handle errors
        recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setError(`Voice search error: ${event.error}`);
            setIsListening(false);
        };

        // Handle end
        recognitionInstance.onend = () => {
            setIsListening(false);
        };

        setRecognition(recognitionInstance);

        return () => {
            if (recognitionInstance) {
                recognitionInstance.stop();
            }
        };
    }, [isSupported, language, continuous]); // Removed onResult from dependencies

    const startListening = useCallback(() => {
        if (!recognition) {
            setError('Speech recognition not initialized');
            return;
        }

        try {
            setError(null);
            setTranscript('');
            recognition.start();
            setIsListening(true);
        } catch (err) {
            console.error('Error starting recognition:', err);
            setError('Failed to start voice search');
        }
    }, [recognition]);

    const stopListening = useCallback(() => {
        if (!recognition) return;

        try {
            recognition.stop();
            setIsListening(false);
        } catch (err) {
            console.error('Error stopping recognition:', err);
        }
    }, [recognition]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setError(null);
    }, []);

    return {
        isListening,
        transcript,
        error,
        isSupported,
        startListening,
        stopListening,
        resetTranscript
    };
};
