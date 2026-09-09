export function getCookie(name: string): string | undefined {
  const matches = document.cookie.match(
    new RegExp(
      '(?:^|; )' +
        // eslint-disable-next-line no-useless-escape
        name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') +
        '=([^;]*)'
    )
  );
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

export function setCookie(
  name: string,
  value: string,
  props: { [key: string]: string | number | Date | boolean } = {}
) {
  const cookieProps: { [key: string]: string | number | Date | boolean } = {
    path: '/',
    ...props
  };

  let exp = cookieProps.expires;
  if (exp && typeof exp === 'number') {
    const d = new Date();
    d.setTime(d.getTime() + exp * 1000);
    exp = d;
  }

  const normalizedProps: { [key: string]: string | number | Date | boolean } = {
    ...cookieProps
  };
  if (exp && exp instanceof Date) {
    normalizedProps.expires = exp.toUTCString();
  }
  let updatedCookie = name + '=' + encodeURIComponent(value);
  for (const propName in normalizedProps) {
    updatedCookie += '; ' + propName;
    const propValue = normalizedProps[propName];
    if (propValue !== true) {
      updatedCookie += '=' + propValue;
    }
  }
  document.cookie = updatedCookie;
}

export function deleteCookie(name: string) {
  setCookie(name, '', { expires: -1 });
}
