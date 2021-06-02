/** @jsx jsx */
import { css, jsx } from "@emotion/react";
import styled from "@emotion/styled";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Tooltip from "@material-ui/core/Tooltip";
import CloseIcon from "@material-ui/icons/Close";
import { colors } from "common/colors";
import React from "react";
import { Link, Redirect, Route, Switch, useHistory, useRouteMatch } from "react-router-dom";

import { DualPane } from "@/components/DualPane";
import { useSettingsModal } from "@/lib/hooks/useSettingsModal";

import { settings } from "../containers/Settings";

const Outer = styled.div`
  position: relative;
  display: flex;
  height: 100%;
  width: 100%;
`;

const MenuColumn = styled.div`
  flex: 1;
  padding-top: 20px;
`;

const ContentColumn = styled.div`
  flex: 1;
  padding-top: 30px;
  padding-bottom: 30px;
  padding-left: 30px;
  padding-right: 100px;
`;

const CloseButton = styled(IconButton)`
  opacity: 0.5;
  position: absolute;
  top: 5px;
  right: 10px;
  z-index: 1;
`;

const settingItems = settings.flatMap((section) => section.items);

export const SettingsView: React.FC = () => {
  const history = useHistory();
  const { path } = useRouteMatch();
  const { close } = useSettingsModal();

  const isActive = (name: string): boolean => {
    return history.location.pathname === `${path}/${name}`;
  };

  const keyDownFunction = (event: KeyboardEvent) => {
    // ignore depercation warning, it works everywhere
    if (event.keyCode === 27) {
      close();
    }
  };

  React.useEffect(() => {
    document.addEventListener("keydown", keyDownFunction, false);
    return () => document.removeEventListener("keydown", keyDownFunction, false);
  }, [keyDownFunction]);

  return (
    <Outer>
      <Tooltip title="Close">
        <CloseButton onClick={close}>
          <CloseIcon />
        </CloseButton>
      </Tooltip>
      <DualPane
        id="settings-view"
        leftStyle={{ backgroundColor: colors.purpleDark }}
        leftSide={
          <MenuColumn>
            {settings.map((section, i) => {
              return (
                <List
                  key={`section-${section.title}${i}`}
                  component="nav"
                  css={css`
                    padding-bottom: 10px;
                  `}
                  subheader={
                    section.title ? (
                      <ListSubheader
                        component="div"
                        disableSticky={true}
                        css={css`
                          line-height: 20px;
                          font-size: 14px;
                          color: ${colors.purpleLight};
                        `}
                      >
                        {section.title}
                      </ListSubheader>
                    ) : undefined
                  }
                >
                  {section.items.map((item) => {
                    return (
                      <ListItem
                        button
                        key={item.name}
                        selected={isActive(item.path)}
                        component={Link}
                        to={`${path}/${item.path}`}
                        css={css`
                          padding-top: 4px;
                          padding-bottom: 4px;
                        `}
                      >
                        {item.icon ? <ListItemIcon>{item.icon}</ListItemIcon> : null}
                        <ListItemText
                          primary={item.name}
                          css={css`
                            .MuiTypography-body1 {
                              font-size: 16px;
                            }
                          `}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              );
            })}
          </MenuColumn>
        }
        rightSide={
          <ContentColumn>
            <Switch>
              {settingItems.map((item) => {
                const fullItemPath = `${path}/${item.path}`;
                return (
                  <Route key={fullItemPath} path={fullItemPath}>
                    {item.component}
                  </Route>
                );
              })}
              {settingItems.length > 0 && (
                <Route exact path={path}>
                  <Redirect to={`${path}/${settingItems[0].path}`} />
                </Route>
              )}
            </Switch>
          </ContentColumn>
        }
      />
    </Outer>
  );
};
