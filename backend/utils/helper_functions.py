# File: utils/helper_functions.py
# Used to fixed rendering bugs in the fundamental matrix

def generate_eodhd_filter_schema(data: dict) -> list[str]:
    """
    Generate flat list of keys in the form:
    - Section::Key        (second level)
    - Section::Subsection::Key  (third level)
    """
    paths = []

    def walk(obj, path_parts):
        if isinstance(obj, dict):
            for key, val in obj.items():
                new_path = path_parts + [key]
                if len(new_path) == 2:
                    paths.append("::".join(new_path))
                elif len(new_path) == 3:
                    paths.append("::".join(new_path))
                walk(val, new_path)
        elif isinstance(obj, list):
            # Skip lists at level 3+ to avoid going deeper
            pass

    walk(data, [])
    return paths


def convert_numeric_keys_to_arrays(obj):
    """
    Recursively traverse obj. If it finds an object/dict with all-numeric keys,
    it converts those keys into a list of values (recursively checking inside).
    Returns the transformed structure.
    """

    if isinstance(obj, dict):
        # Check if *all* keys are numeric
        keys = list(obj.keys())
        if all(k.isdigit() for k in keys):
            # Sort keys numerically, map to values, recursively convert
            array_form = []
            for key in sorted(keys, key=lambda x: int(x)):
                array_form.append(convert_numeric_keys_to_arrays(obj[key]))
            return array_form
        else:
            # For other dicts, keep them as dict but convert children
            return {k: convert_numeric_keys_to_arrays(v) for k, v in obj.items()}

    elif isinstance(obj, list):
        # Recursively convert children
        return [convert_numeric_keys_to_arrays(item) for item in obj]

    # Primitives remain unchanged
    return obj

