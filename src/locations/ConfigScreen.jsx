import React, { useCallback, useState, useEffect } from 'react';
import { Heading, Form, FormControl, TextInput, Flex } from '@contentful/f36-components';
import { css } from 'emotion';
import { useSDK } from '@contentful/react-apps-toolkit';

const ConfigScreen = () => {
  const sdk = useSDK();
  const [parameters, setParameters] = useState({});
  const [fields, setFields] = useState([
    {
      type: 'text',
      name: 'cb_account_id',
      label: 'Account Identifier',
      helpText: 'Example: 023e105f4ecef8ad9ca31a8372d0c353',
      required: true
    },
    {
      type: 'email',
      name: 'cb_account_email',
      label: 'Account Email',
      required: true
    },
    {
      type: 'text',
      name: 'cb_api_key',
      label: 'API Key',
      required: true
    },
    {
      type: 'text',
      name: 'cb_api_proxy',
      label: 'API Proxy',
      required: true
    },
    {
      type: 'text',
      name: 'cb_project_name',
      label: 'Project Name',
      helpText: 'Example: this-is-my-project-01',
      required: true
    }
  ])

  const onConfigure = useCallback(async () => {
    // This method will be called when a user clicks on 'Install'
    // or 'Save' in the configuration screen.
    // for more details see https://www.contentful.com/developers/docs/extensibility/ui-extensions/sdk-reference/#register-an-app-configuration-hook

    // Get current the state of EditorInterface and other entities
    // related to this app installation
    const currentState = await sdk.app.getCurrentState();
    
    return {
      // Parameters to be persisted as the app configuration.
      parameters,
      // In case you don't want to submit any update to app
      // locations, you can just pass the currentState as is
      targetState: currentState,
    };
  }, [parameters, sdk]);

  useEffect(() => {
    // `onConfigure` allows to configure a callback to be
    // invoked when a user attempts to install the app or update
    // its configuration.
    sdk.app.onConfigure(() => onConfigure());
  }, [sdk, onConfigure]);

  useEffect(() => {
    (async () => {
      // Get current parameters of the app.
      // If the app is not installed yet, `parameters` will be `null`.
      const currentParameters = await sdk.app.getParameters();

      if (currentParameters) {
        let currentFields = [...fields];

        currentFields = currentFields.map((f) => {
          const { name } = f;

          if (Object.getOwnPropertyDescriptor(currentParameters, name)) {
            f.value = currentParameters[name];
          }

          return f;
        })

        setParameters(currentParameters);
        setFields(currentFields);
      }
      // Once preparation has finished, call `setReady` to hide
      // the loading screen and present the app to a user.
      sdk.app.setReady();
    })();
  }, [sdk]);

  return (
    <Flex flexDirection="column" className={css({ margin: '80px', maxWidth: '800px' })}>
      <Form>
        <Heading>Cloudflare Build Config</Heading>
        {fields.map((field) => {
          const {
            type = 'text',
            required = false,
            helpText = '',
            value = '',
            name,
            label
          } = field;

          if (!name || !label) {
            return '';
          }

          return (
            <FormControl key={name} isRequired={required}>
              <FormControl.Label>{label}</FormControl.Label>
              <TextInput
                value={value}
                type={type}
                name={name}
                onChange={(e) => {
                  const currentValue = e.target.value;
                  let currentFields = [...fields];
                  let currentParams = {...parameters};

                  currentParams[name] = currentValue;

                  currentFields = currentFields.map((f) => {
                    if (f.name === name) {
                      f.value = currentValue;
                    }

                    return f;
                  })

                  setFields(currentFields);
                  setParameters(currentParams);
                }}
              />
              {helpText && (
                <FormControl.HelpText>{helpText}</FormControl.HelpText>
              )}
            </FormControl>
          );
        })}
      </Form>
    </Flex>
  );
};

export default ConfigScreen;
