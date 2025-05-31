import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { type SelectProps } from "@mui/material/Select";
import type { Option } from "@/types";

interface MySelectProps {
  options: Option[];
  onChange: (value: unknown) => void;
  value: unknown;
  placeholder?: string;
}
function MySelect({
  options,
  onChange,
  value,
  placeholder,
  ...props
}: MySelectProps & SelectProps) {
  return (
    <FormControl sx={{ m: 1, minWidth: 100 }}>
      <Select
        value={value}
        onChange={onChange}
        displayEmpty
        inputProps={{ "aria-label": "Without label" }}
        {...props}
      >
        {placeholder && (
          <MenuItem disabled value="">
            {placeholder}
          </MenuItem>
        )}
        {options.map((option, index) => (
          <MenuItem key={index} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
export default MySelect;
