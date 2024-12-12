import React, { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { Button } from "@mui/material";
import JSZip from "jszip";
import {API_BASE_URL} from "../api";

interface MediaConverterProps {
    file: File | null;
    onConversionComplete: (zipFile: File) => void;
}

const MediaConverter: React.FC<MediaConverterProps> = ({ file, onConversionComplete }) => {
    const [loaded, setLoaded] = useState(false);
    const ffmpegRef = useRef(new FFmpeg());
    const messageRef = useRef<HTMLParagraphElement | null>(null);

    const load = async () => {
        const baseURL = `${API_BASE_URL}/ffmpeg`;
        const ffmpeg = ffmpegRef.current;
        ffmpeg.on("log", ({ message }) => {
            if (messageRef.current) messageRef.current.innerHTML = message;
        });
        if (API_BASE_URL === 'http://localhost:8080'){
            await ffmpeg.load();
        } else {
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
                workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript"),
            });
        }
        setLoaded(true);
    };

    const convertAndZip = async () => {
        if (!file) return;

        const ffmpeg = ffmpegRef.current;
        const fileData = await fetchFile(file);
        await ffmpeg.writeFile(file.name, fileData);
        await ffmpeg.createDir('output')

        await ffmpeg.exec(["-i", file.name, "-hls_time", "10", "-hls_list_size", "0", "-f", "hls", "output/output.m3u8"]);

        const outputFiles = await ffmpeg.listDir('/output');
        const zip = new JSZip();

        for (const fileName of outputFiles) {
            if(fileName.isDir)
                continue;
            const fileContent = await ffmpeg.readFile(`output/${fileName.name}`);
            zip.file(fileName.name, fileContent);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipFile = new File([zipBlob], `${file.name}.zip`, { type: 'application/zip' });
        onConversionComplete(zipFile);
    };

    return loaded ? (
        <>
            <Button onClick={convertAndZip}>Convert and Zip</Button>
            <p ref={messageRef}></p>
        </>
    ) : (
        <Button onClick={load}>Load ffmpeg-core</Button>
    );
};

export default MediaConverter;