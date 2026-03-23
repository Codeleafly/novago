package native

import (
	"os"
	"os/exec"
	"runtime"
	"time"

	nruntime "novago/runtime"
)

func CreateSysModule(version string) *nruntime.ObjectVal {
	sysProps := make(map[string]nruntime.RuntimeVal)

	sysProps["platform"] = nruntime.MK_STRING(runtime.GOOS)
	sysProps["arch"] = nruntime.MK_STRING(runtime.GOARCH)
	sysProps["version"] = nruntime.MK_STRING(version)

	sysProps["env"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		key := args[0].(*nruntime.StringVal).Value
		val, exists := os.LookupEnv(key)
		if exists {
			return nruntime.MK_STRING(val)
		}
		return nruntime.MK_NULL()
	})

	sysProps["hostname"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		name, err := os.Hostname()
		if err != nil {
			return nruntime.MK_NULL()
		}
		return nruntime.MK_STRING(name)
	})

	sysProps["exec"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		cmdStr := args[0].(*nruntime.StringVal).Value
		var cmd *exec.Cmd
		if runtime.GOOS == "windows" {
			cmd = exec.Command("cmd", "/c", cmdStr)
		} else {
			cmd = exec.Command("sh", "-c", cmdStr)
		}
		out, err := cmd.CombinedOutput()
		if err != nil {
			return nruntime.MK_STRING(string(out) + "\n" + err.Error())
		}
		return nruntime.MK_STRING(string(out))
	})

	sysProps["exit"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		code := 0
		if len(args) > 0 {
			if num, ok := args[0].(*nruntime.NumberVal); ok {
				code = int(num.Value)
			}
		}
		os.Exit(code)
		return nruntime.MK_NULL()
	})

	sysProps["time"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		return nruntime.MK_NUMBER(float64(time.Now().UnixMilli()))
	})

	return nruntime.MK_OBJECT(sysProps)
}
