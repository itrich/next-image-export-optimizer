import dynamic from "next/dynamic";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import { ImageProps, StaticImageData } from "next/image";

type SplitFilePathProps = {
  filePath: string;
};

const splitFilePath = ({ filePath }: SplitFilePathProps) => {
  const filenameWithExtension =
    filePath.split("\\").pop()?.split("/").pop() || "";
  const filePathWithoutFilename = filePath.split(filenameWithExtension).shift();
  const fileExtension = filePath.split(".").pop();
  const filenameWithoutExtension =
    filenameWithExtension.substring(
      0,
      filenameWithExtension.lastIndexOf(".")
    ) || filenameWithExtension;
  return {
    path: filePathWithoutFilename,
    filename: filenameWithoutExtension,
    extension: fileExtension || "",
  };
};

const generateImageURL = (src: string, width: number) => {
  const { filename, path, extension } = splitFilePath({ filePath: src });

  if (
    !["JPG", "JPEG", "WEBP", "PNG", "AVIF"].includes(extension.toUpperCase())
  ) {
    // The images has an unsupported extension
    // We will return the src
    return src;
  }
  // If the images are stored as WEBP by the package, then we should change
  // the extension to WEBP to load them correctly
  let processedExtension = extension;

  if (
    (process.env.storePicturesInWEBP === true ||
      process.env.nextImageExportOptimizer_storePicturesInWEBP === true) &&
    ["JPG", "JPEG", "PNG"].includes(extension.toUpperCase())
  ) {
    processedExtension = "WEBP";
  }
  let correctedPath = path;
  const lastChar = correctedPath?.substr(-1); // Selects the last character
  if (lastChar != "/") {
    // If the last character is not a slash
    correctedPath = correctedPath + "/"; // Append a slash to it.
  }
  let generatedImageURL = `${correctedPath}nextImageExportOptimizer/${filename}-opt-${width}.${processedExtension.toUpperCase()}`;
  // if the generatedImageURL hat a slash at the beginning, we remove it
  if (generatedImageURL.charAt(0) === "/") {
    generatedImageURL = generatedImageURL.substr(1);
  }

  return generatedImageURL;
};

const optimizedLoader = ({
  src,
  width,
}: {
  src: string | StaticImageData;
  width: number;
}) => {
  const _src = typeof src === "object" ? src.src : src;
  return generateImageURL(_src, width);
};

const fallbackLoader = ({ src }: { src: string | StaticImageData }) => {
  const _src = typeof src === "object" ? src.src : src;
  return _src;
};

export interface ExportedImageProps
  extends Omit<ImageProps, "src" | "loader" | "onError"> {
  src: string | StaticImageData;
}

function ExportedImage({
  src,
  priority = false,
  loading,
  lazyRoot = null,
  lazyBoundary = "200px",
  className,
  quality,
  width,
  height,
  objectFit,
  objectPosition,
  onLoadingComplete,
  unoptimized,
  placeholder = process.env.generateAndUseBlurImages === true ||
  process.env.nextImageExportOptimizer_generateAndUseBlurImages === true
    ? "blur"
    : "empty",
  blurDataURL,
  ...rest
}: ExportedImageProps) {
  const [imageError, setImageError] = useState(false);
  const automaticallyCalculatedBlurDataURL = useMemo(() => {
    if (blurDataURL) {
      // use the user provided blurDataURL if present
      return blurDataURL;
    }
    // check if the src is specified as a local file -> then it is an object
    const _src = typeof src === "object" ? src.src : src;
    if (unoptimized === true) {
      // return the src image when unoptimized
      return _src;
    }
    // otherwise use the generated image of 10px width as a blurDataURL
    return generateImageURL(_src, 10);
  }, [blurDataURL, src, unoptimized]);

  return (
    <Image
      {...rest}
      {...(width && { width })}
      {...(height && { height })}
      {...(priority && { priority })}
      {...(loading && { loading })}
      {...(lazyRoot && { lazyRoot })}
      {...(lazyBoundary && { lazyBoundary })}
      {...(className && { className })}
      {...(quality && { quality })}
      {...(objectFit && { objectFit })}
      {...(objectPosition && { objectPosition })}
      {...(onLoadingComplete && { onLoadingComplete })}
      {...(placeholder && { placeholder })}
      {...(unoptimized && { unoptimized })}
      {...(imageError && { unoptimized: true })}
      loader={
        imageError || unoptimized === true ? fallbackLoader : optimizedLoader
      }
      blurDataURL={automaticallyCalculatedBlurDataURL}
      src={src}
      onError={() => {
        setImageError(true);
      }}
    />
  );
}
// Dynamic loading with SSR off is necessary as there is a race condition otherwise,
// when the image loaded and errored before the JS error handler is attached
export default dynamic(() => Promise.resolve(ExportedImage), {
  ssr: false,
});
