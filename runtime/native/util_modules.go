package native

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"path/filepath"
	"regexp"
	"time"

	nruntime "novago/runtime"
)

func CreateUtilModules() map[string]nruntime.RuntimeVal {
	modules := make(map[string]nruntime.RuntimeVal)

	// Date Module
	dateProps := make(map[string]nruntime.RuntimeVal)
	dateProps["now"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		return nruntime.MK_NUMBER(float64(time.Now().UnixMilli()))
	})
	dateProps["toISO"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		ms := time.Now().UnixMilli()
		if len(args) > 0 {
			if num, ok := args[0].(*nruntime.NumberVal); ok {
				ms = int64(num.Value)
			}
		}
		return nruntime.MK_STRING(time.UnixMilli(ms).UTC().Format(time.RFC3339))
	})
	modules["Date"] = nruntime.MK_OBJECT(dateProps)

	// Regex Module
	regexProps := make(map[string]nruntime.RuntimeVal)
	regexProps["test"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		pattern := args[0].(*nruntime.StringVal).Value
		str := args[1].(*nruntime.StringVal).Value
		matched, _ := regexp.MatchString(pattern, str)
		return nruntime.MK_BOOL(matched)
	})
	regexProps["replace"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		pattern := args[0].(*nruntime.StringVal).Value
		str := args[1].(*nruntime.StringVal).Value
		replacement := args[2].(*nruntime.StringVal).Value
		re, err := regexp.Compile(pattern)
		if err != nil {
			return nruntime.MK_STRING(str)
		}
		return nruntime.MK_STRING(re.ReplaceAllString(str, replacement))
	})
	modules["Regex"] = nruntime.MK_OBJECT(regexProps)

	// Base64 Module
	b64Props := make(map[string]nruntime.RuntimeVal)
	b64Props["encode"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		return nruntime.MK_STRING(base64.StdEncoding.EncodeToString([]byte(args[0].(*nruntime.StringVal).Value)))
	})
	b64Props["decode"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		data, _ := base64.StdEncoding.DecodeString(args[0].(*nruntime.StringVal).Value)
		return nruntime.MK_STRING(string(data))
	})
	modules["Base64"] = nruntime.MK_OBJECT(b64Props)

	// Console Module
	consoleProps := make(map[string]nruntime.RuntimeVal)
	consoleProps["error"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		fmt.Println("ERROR:", nruntime.PlainStringify(args[0]))
		return nruntime.MK_NULL()
	})
	consoleProps["warn"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		fmt.Println("WARN:", nruntime.PlainStringify(args[0]))
		return nruntime.MK_NULL()
	})
	modules["Console"] = nruntime.MK_OBJECT(consoleProps)

	// Path Module
	pathProps := make(map[string]nruntime.RuntimeVal)
	pathProps["join"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		var parts []string
		for _, arg := range args {
			if strVal, ok := arg.(*nruntime.StringVal); ok {
				parts = append(parts, strVal.Value)
			}
		}
		return nruntime.MK_STRING(filepath.Join(parts...))
	})
	pathProps["basename"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		return nruntime.MK_STRING(filepath.Base(args[0].(*nruntime.StringVal).Value))
	})
	pathProps["dirname"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		return nruntime.MK_STRING(filepath.Dir(args[0].(*nruntime.StringVal).Value))
	})
	pathProps["extname"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		return nruntime.MK_STRING(filepath.Ext(args[0].(*nruntime.StringVal).Value))
	})
	modules["Path"] = nruntime.MK_OBJECT(pathProps)

	// JSON Module
	jsonProps := make(map[string]nruntime.RuntimeVal)
	jsonProps["stringify"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		// Simplistic implementation
		return nruntime.MK_STRING(nruntime.PlainStringify(args[0]))
	})
	jsonProps["parse"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		if len(args) == 0 {
			return nruntime.MK_NULL()
		}
		str := args[0].(*nruntime.StringVal).Value
		var jsObj interface{}
		err := json.Unmarshal([]byte(str), &jsObj)
		if err != nil {
			return nruntime.MK_NULL()
		}
		return nruntime.GoToRuntimeVal(jsObj)
	})
	modules["JSON"] = nruntime.MK_OBJECT(jsonProps)

	return modules
}
