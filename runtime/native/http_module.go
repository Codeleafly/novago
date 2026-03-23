package native

import (
	"io"
	"net/http"
	"strings"

	nruntime "novago/runtime"
)

func CreateHTTPModule() *nruntime.ObjectVal {
	httpProps := make(map[string]nruntime.RuntimeVal)

	makeRequest := func(method string, urlStr string, bodyData string, headers map[string]string) nruntime.RuntimeVal {
		var reqBody io.Reader
		if bodyData != "" {
			reqBody = strings.NewReader(bodyData)
		}
		req, err := http.NewRequest(method, urlStr, reqBody)
		if err != nil {
			return nruntime.MK_NULL()
		}

		for k, v := range headers {
			req.Header.Set(k, v)
		}

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			return nruntime.MK_NULL()
		}
		defer resp.Body.Close()

		resBody, _ := io.ReadAll(resp.Body)

		resProps := make(map[string]nruntime.RuntimeVal)
		resProps["data"] = nruntime.MK_STRING(string(resBody))
		resProps["status"] = nruntime.MK_NUMBER(float64(resp.StatusCode))

		return nruntime.MK_OBJECT(resProps)
	}

	httpProps["get"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		url := args[0].(*nruntime.StringVal).Value
		headers := make(map[string]string)
		if len(args) > 1 {
			if obj, ok := args[1].(*nruntime.ObjectVal); ok {
				for k, v := range obj.Properties {
					if strVal, ok := v.(*nruntime.StringVal); ok {
						headers[k] = strVal.Value
					}
				}
			}
		}
		return makeRequest("GET", url, "", headers)
	})

	httpProps["post"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		url := args[0].(*nruntime.StringVal).Value
		data := ""
		if len(args) > 1 {
			data = args[1].(*nruntime.StringVal).Value
		}
		headers := map[string]string{"Content-Type": "application/json"}
		if len(args) > 2 {
			if obj, ok := args[2].(*nruntime.ObjectVal); ok {
				for k, v := range obj.Properties {
					if strVal, ok := v.(*nruntime.StringVal); ok {
						headers[k] = strVal.Value
					}
				}
			}
		}
		return makeRequest("POST", url, data, headers)
	})

	return nruntime.MK_OBJECT(httpProps)
}
