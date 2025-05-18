import axios from "axios";
import FormData from "form-data";

import { MEDIA_SERVER_URL } from "@src/constants/constants";

import { _hash } from "./pinata";

export const STORJ_API_URL = "https://www.storj-ipfs.com";

export const pinJson = async (json: any) => {
  const { data } = await axios.post(
    "/api/storj/add-json",
    { json },
    {
      headers: {
        "Content-Type": `application/json`,
      },
    },
  );

  return data;
};

export const pinFile = async (file: any) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axios.post("/api/storj/add-file", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return data.Hash;
};

export const pinFolderBase64 = async (base64Files: string[], watermark = false) => {
  const formData = new FormData();

  base64Files.forEach((file, index) => {
    const blob = Buffer.from(file.split(",")[1], "base64");
    const fileObject = new File([blob], `${index}.png`, { type: "image/png" });
    formData.append(`file_${index}`, fileObject);
  });

  return await addFolder(formData, watermark);
};

export const pinFolder = async (files: File[], watermark = false) => {
  const formData = new FormData();

  files.forEach((file, index) => {
    formData.append(`file_${index}`, file, `${index + 1}.png`);
  });

  return await addFolder(formData, watermark);
};

const addFolder = async (formData: FormData, watermark = false) => {
  const { data } = await axios.post(`${MEDIA_SERVER_URL}/api/add-folder?watermark=${watermark}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return data;
};

export const getViaStorjGateway = async (uriOrHash: string) => {
  const { data } = await axios.get(storjGatewayURL(uriOrHash));
  return data;
};

export const storjGatewayURL = (uriOrHash: string, useDefault = false) => `${useDefault ?  "https://ipfs.io" : STORJ_API_URL}/ipfs/${_hash(uriOrHash)}`;

export const storjToDefaultGateway = (url: string) => {
  if (!url) return url;
  if (url.startsWith(STORJ_API_URL)) {
    return url.replace(STORJ_API_URL, "https://ipfs.io");
  }
  return url;
};
