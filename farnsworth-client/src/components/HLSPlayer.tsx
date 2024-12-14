import React, {useRef, useEffect, useState} from 'react';
import Hls from 'hls.js';
import { Dialog, DialogContent } from '@mui/material';
import * as API from "../api"

interface HLSPlayerProps {
    src: string;
    visible: boolean;
    onClose: () => void;
    onEnded: () => void;
    captionsSrc?: string; // Optional prop for captions
}


const HLSPlayer: React.FC<HLSPlayerProps> = ({ src, visible, onClose, onEnded, captionsSrc }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isVideoReady, setVideoReady] = useState(false);
    const [captionsUrl, setCaptionsUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (videoRef.current) {
            setVideoReady(true);
        }
    }, [videoRef.current]);

    useEffect(() => {
        if (videoRef.current) {
            return () => {
                videoRef.current?.removeEventListener('ended', onEnded);
            };
        }
    }, [onEnded]);

    useEffect(() => {
        if (!visible) {
            return;
        }
        if (!videoRef.current) {
            return;
        }
        handleVideoOpen();

    }, [src, visible, isVideoReady]);

    useEffect(() => {
        if (captionsSrc) {
            fetch(captionsSrc, {
                headers: {
                    'Authorization': `Bearer ${API.getAuthToken()}`
                }
            })
                .then(response => response.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    setCaptionsUrl(url);
                })
                .catch(error => {
                    console.error('Error fetching captions:', error);
                });
        }
    }, [captionsSrc]);

    function handleVideoOpen(): void {
        if (src && videoRef.current) {
            videoRef.current.addEventListener('ended', onEnded);
            if (Hls.isSupported()) {
                const hls = new Hls({
                    xhrSetup: (xhr) => {
                        xhr.setRequestHeader('Authorization', `Bearer ${API.getAuthToken()}`);
                        console.log('Authorization header set');
                    },
                });
                hls.loadSource(src);
                hls.attachMedia(videoRef.current);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoRef.current?.play().catch(error => {
                        console.error('Error attempting to play:', error);
                    });
                });
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                console.log('Using native HLS support');
                videoRef.current.src = src;
                videoRef.current.addEventListener('loadedmetadata', () => {
                    videoRef.current?.play().catch(error => {
                        console.error('Error attempting to play:', error);
                    });
                });
            }
        }
    }

    return (
        <Dialog open={visible} onClose={onClose} maxWidth="md" fullWidth>
            <DialogContent>
                <video ref={(element) => {
                    videoRef.current = element;
                    handleVideoOpen();
                }} controls style={{ width: '100%', height: 'auto' }}>
                    {captionsUrl && (
                        <track
                            kind="subtitles"
                            src={captionsUrl}
                            srcLang="en"
                            label="English"
                            default
                        />
                    )}
                </video>
            </DialogContent>
        </Dialog>
    );
};

export default HLSPlayer;