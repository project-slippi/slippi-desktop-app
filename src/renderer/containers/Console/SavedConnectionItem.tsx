/** @jsx jsx */

import { css, jsx } from "@emotion/react";
import styled from "@emotion/styled";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import IconButton from "@material-ui/core/IconButton";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import { StoredConnection } from "@settings/types";
import { ConnectionStatus } from "@slippi/slippi-js";
import React from "react";
import { useToasts } from "react-toast-notifications";

import { LabelledText } from "@/components/LabelledText";
import { connectToConsole, disconnectFromConsole, startConsoleMirror } from "@/lib/consoleConnection";
import { ReactComponent as WiiIcon } from "@/styles/images/wii-icon.svg";

export interface SavedConnectionItemProps {
  index: number;
  isAvailable?: boolean;
  status: number;
  nickname?: string;
  currentFilename: string | null;
  connection: StoredConnection;
  onOpenMenu: (index: number, element: HTMLElement) => void;
}

export const SavedConnectionItem: React.FC<SavedConnectionItemProps> = ({
  index,
  connection,
  onOpenMenu,
  status,
  nickname,
  isAvailable,
  currentFilename,
}) => {
  const { addToast } = useToasts();
  const onConnect = () => connectToConsole(connection);
  const onMirror = () => {
    if (process.platform === "darwin") {
      addToast("Dolphin may open in the background, please check the app bar", {
        appearance: "info",
        autoDismiss: true,
      });
    }
    startConsoleMirror(connection.ipAddress);
  };
  const onDisconnect = () => disconnectFromConsole(connection.ipAddress);
  const statusName = status === ConnectionStatus.DISCONNECTED && isAvailable ? "Available" : renderStatusName(status);
  const isConnected = status !== ConnectionStatus.DISCONNECTED;
  const title = nickname ? `${connection.ipAddress} (${nickname})` : connection.ipAddress;
  return (
    <Outer>
      <CardHeader
        avatar={<WiiIcon fill="#ffffff" width="40px" />}
        action={
          <IconButton onClick={(e) => onOpenMenu(index, e.currentTarget as HTMLElement)}>
            <MoreVertIcon />
          </IconButton>
        }
        title={title}
        subheader={statusName}
      />
      <CardContent
        css={css`
          &&& {
            padding-top: 0;
            padding-bottom: 0;
          }
        `}
      >
        {currentFilename && (
          <LabelledText
            label="Current file"
            css={css`
              margin-bottom: 5px;
            `}
          >
            <span
              css={css`
                font-size: 14px;
              `}
            >
              {currentFilename}
            </span>
          </LabelledText>
        )}
        <LabelledText label="Target folder">
          <span
            css={css`
              font-size: 14px;
            `}
          >
            {connection.folderPath}
          </span>
        </LabelledText>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          color={isConnected ? "secondary" : "primary"}
          onClick={isConnected ? onDisconnect : onConnect}
        >
          {isConnected ? "Disconnect" : "Connect"}
        </Button>
        <Button size="small" onClick={onMirror} color="secondary" disabled={!isConnected}>
          Mirror
        </Button>
      </CardActions>
    </Outer>
  );
};

const Outer = styled(Card)`
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
`;

const renderStatusName = (status: number) => {
  switch (status) {
    case ConnectionStatus.CONNECTED:
      return "Connected";
    case ConnectionStatus.CONNECTING:
      return "Connecting";
    case ConnectionStatus.RECONNECT_WAIT:
      return "Reconnecting";
    case ConnectionStatus.DISCONNECTED:
      return "Disconnected";
    default:
      return `Unknown status: ${status}`;
  }
};
