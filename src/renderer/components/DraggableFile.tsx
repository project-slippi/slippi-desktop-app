import styled from "@emotion/styled";
import { ipcRenderer } from "electron";
import React from "react";
import * as htmlToImage from "html-to-image";

const Outer = styled.div`
  color: inherit;
  cursor: grab;
  user-select: auto;
  -webkit-user-drag: element;
  -webkit-app-region: drag;
`;

export interface DraggableFileProps {
  filePaths: string[];
  className?: string;
  style?: React.CSSProperties;
}

/**
 * DraggableFile accepts the `filePaths` prop and allows those files to be dragged into other contexts
 * such as copied to a different folder or dragged into web-sites etc.
 */
export const DraggableFile: React.FC<DraggableFileProps> = ({ children, filePaths, className, style }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (filePaths.length > 0) {
      // If we have selected non-zero files for dragging, update the count and then convert the div to a dataURL to send
      document.getElementById("dragCount")!.innerHTML = filePaths.length > 1 ? filePaths.length.toString() : "";

      void htmlToImage.toPng(document.getElementById("dragCountParent") as HTMLDivElement).then(function (dataURL) {
        ipcRenderer.send("onDragStart", filePaths, dataURL);
      });
    }
  };

  return (
    <div>
      {
        <Outer
          className={className}
          style={style}
          onDragStart={(e) => handleDragStart(e)}
          onClick={(e) => e.preventDefault()}
        >
          {children}
        </Outer>
      }
    </div>
  );
};
