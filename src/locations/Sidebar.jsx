import React, { useEffect, useState, useRef } from 'react';
import { Button, Text } from '@contentful/f36-components';
import { useSDK } from '@contentful/react-apps-toolkit';

const Sidebar = () => {
  const sdk = useSDK();
  const [disabled, setDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const params = useRef(false);

  /* Init */

  useEffect(() => {
    (async () => {
      const parameters = sdk.parameters.installation;

      const {
        cb_api_key: apiKey,
        cb_api_proxy: apiProxy,
        cb_account_id: accountId,
        cb_account_email: accountEmail,
        cb_project_name: projectName
      } = parameters;

      const reqParams = apiKey && apiProxy && accountId && accountEmail && projectName ? true : false;

      if (reqParams) {
        setResult('init_success');
        
        params.current = {
          apiKey,
          apiProxy,
          accountId,
          accountEmail,
          projectName
        };
      } else {
        setResult('init_fail');
      }
      
      const checkDeploy = await fetch(
        `https://${apiProxy}/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Email': accountEmail,
            'X-Auth-Key': apiKey
          }
        }
      );

      const json = await checkDeploy.json();

      if (json.success) {
        const res = json.result;

        if (res.length) {
          let active = false;

          res.forEach((r) => {
            if (r.production_branch === 'main' && r.environment === 'production' && r.latest_stage.name !== 'deploy' && !r.latest_stage.ended_on && r.latest_stage.status !== 'canceled') {
              active = r;
            }
          });

          if (active) {
            setLoading(true);
            setDisabled(true);

            poll(
              `https://${apiProxy}/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments/${active.short_id}`
            );
          }
        }
      }
    })();
  }, [sdk]);

  /* Set message and button disabled and loading */

  const setResult = (type = 'build') => {
    let message = 'There was a problem building the site. Try again later.';
    let disabled = type === 'build';

    if (type === 'build') {
      message = 'Site build triggered.';
    }

    if (type === 'done') {
      message = 'Site build complete.';
    }

    if (type === 'init_fail') {
      disabled = true;
      message = 'Required configuration fields have not been filled out.';
    }

    if (type === 'init_success') {
      disabled = false;
      message = '';
    }

    setLoading(type === 'build');
    setDisabled(disabled);
    setMessage(message);
  };

  /* Poll deployment at 30 second intervals */

  const poll = (url = '') => {
    const polling = setInterval(async () => {
      try {
        const {
          apiKey,
          accountEmail
        } = params.current;

        const poll = await fetch(
          url,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth-Email': accountEmail,
              'X-Auth-Key': apiKey
            }
          }
        );

        const pollJson = await poll.json();

        if (pollJson.success) {
          if (pollJson.result.latest_stage.name === 'deploy' && pollJson.result.latest_stage.ended_on) {
            clearInterval(polling);
            setResult('done');
          }

          if (pollJson.result.latest_stage.status === 'canceled') {
            throw new Error('Deploy canceled');
          }
        } else {
          throw new Error('Polling error');
        }
      } catch {
        clearInterval(polling);
        setResult('error');
      }
    }, 30000);
  };

  /* Button click callback */

  const clickHandler = async () => {
    /* Update button */

    setLoading(true);
    setDisabled(true);

    const {
      apiKey,
      apiProxy,
      accountId,
      accountEmail,
      projectName
    } = params.current;

    const form = new FormData();
    form.append('branch', ''); // Branch option not functional

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=---011000010111000001101001',
        'X-Auth-Email': accountEmail,
        'X-Auth-Key': apiKey
      }
    };

    options.body = form;

    /* Request */

    try {
      const response = await fetch(
        `https://${apiProxy}/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`, options
      );
  
      const json = await response.json();
  
      if (json.success) {
        setResult('build');
  
        poll(
          `https://${apiProxy}/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments/${json.result.short_id}`
        );
      } else {
        throw new Error('Deploy unsuccessful');
      }
    } catch {
      setResult('error');
    }
  };

  return (
    <>
      <Button
        variant="primary"
        isFullWidth
        isDisabled={disabled}
        isLoading={loading}
        onClick={clickHandler}
      >
        Build Site
      </Button>
      <div aria-live="polite">
        <Text
          fontColor="gray600"
          marginTop="spacingM"
          as="p"
        >
          {message}
        </Text>
      </div>
    </>
  );
};

export default Sidebar;
