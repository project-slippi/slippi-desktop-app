import styled from "@emotion/styled";
import Button from "@material-ui/core/Button";
import InputBase from "@material-ui/core/InputBase";
import Paper from "@material-ui/core/Paper";
import { OpenDialogOptions, remote } from "electron";
import React from "react";
import Grade from "@material-ui/icons/Grade";
import { Checkbox } from "./FormInputs/Checkbox";
import { useState } from "react";
import Tooltip from "@material-ui/core/Tooltip";

export interface PathInputMultipleProps {
  onSelect: (
    dirs: {
      path: string;
      isDefault?: boolean | undefined;
    }[],
  ) => void;
  placeholder?: string;
  values?: {
    path: string;
    isDefault?: boolean | undefined;
  }[];
  options?: OpenDialogOptions;
  endAdornment?: JSX.Element;
  disabled?: boolean;
}

export const PathInputMultiple = React.forwardRef<HTMLInputElement, PathInputMultipleProps>((props) => {
  const { values, onSelect, options } = props;

  const onAddClick = async () => {
    const result = await remote.dialog.showOpenDialog({ properties: ["openFile"], ...options });
    const res = result.filePaths;
    if (result.canceled || res.length === 0) {
      return;
    }
    updateCheckboxSelections((arr) => {
      const newArr = arr;
      newArr.push(false);
      return [...newArr];
    });

    /*onSelect((dirs: any) => {
      const newArr = dirs;
      newArr.push({ path: res[0] });
      return [...newArr];
    });*/
  };

  const onRemoveClick = async () => {
    console.log(checkboxSelections);
    return;
  };

  const [checkboxSelections, updateCheckboxSelections] = useState(Array(values?.length).fill(false));

  const onToggle = (index: number) => {
    updateCheckboxSelections((arr) => {
      const newArr = arr;
      newArr[index] = !newArr[index];
      return [...newArr];
    });
  };

  const Rows = values?.map((value, index) => {
    return (
      <MultiRowEntry key={index}>
        <MultiRowInput value={value.path} disabled={true} endAdornment={null} />
        <Check>
          <Checkbox label={""} checked={checkboxSelections[index]} onChange={() => onToggle(index)} />
        </Check>
        {value.isDefault ? (
          <DefaultMarker>
            <Tooltip
              disableHoverListener={false}
              placement={"left"}
              title="Default directory - new SLP replays are saved here"
            >
              <div>
                <Grade />
              </div>
            </Tooltip>
          </DefaultMarker>
        ) : (
          ""
        )}
      </MultiRowEntry>
    );
  });

  return (
    <Outer>
      <InputContainer>{Rows}</InputContainer>
      <ButtonGroup>
        <Button color="secondary" variant="contained" onClick={onAddClick} style={{ margin: "2.5px", padding: "0px" }}>
          Add
        </Button>
        <Button
          color="secondary"
          variant="contained"
          onClick={onRemoveClick}
          disabled={checkboxSelections.indexOf(true) === -1}
          style={{ margin: "2.5px", padding: "0px", paddingLeft: "10px", paddingRight: "10px" }}
        >
          Remove
        </Button>
      </ButtonGroup>
    </Outer>
  );
});

const Outer = styled.div`
  display: block;
`;

const InputContainer = styled(Paper)`
  padding: 2px;
  display: flex;
  align-items: center;
  width: 400;
  flex: 1;
  margin-right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  border: 0px dashed yellow;
  display: block;
`;

const MultiRowEntry = styled.div`
  border: 0px dashed purple;
  display: block;
`;

const MultiRowInput = styled(InputBase)`
  margin-left: 16px;
  margin-right: 16px;
  flex: 1;
  width: 70%;
  font-weight: 300;
  font-size: 14px;
  border: 0px dashed green;
  padding-top: 6px;
`;

const DefaultMarker = styled.div`
  border: 0px dashed red;
  float: right;
  margin-top: 4px;
  margin-bottom: 0px;
  opacity: 0.7;
  &:hover {
    opacity: 1;
  }
`;

const Check = styled.div`
  border: 0px solid yellow;
  float: right;
  border-radius: 25%;
  padding: 5px;
`;

const ButtonGroup = styled.div`
  float: right;
  padding: 5px;
`;
