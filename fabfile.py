#
#   IMPORTANT NOTE:
#   Fabric is deprecated and will be available until March 31, 2020
#   This fabfile still serves as a guide for migration to Firebase
#   or can be used as a reference to the actual steps required to install the server
#


from fabric import Connection
from fabric import task

env = {
    'project_name': 'netmesh',
    'path': '/var/www/netmesh-web-speedtest',
    'release': 'current',
    'upload_path': 'netmesh',
    'project_folder': 'netmesh',
    'media_folder': 'media',
    'http_server': 'gunicorn_nginx',
}


@task
def lab(ctx):
    c = Connection(host='192.168.1.104',
                   user='netmesh',
                   port=22,
                   connect_kwargs={
                       "passphrase": "netmesh"
                   },
                   )
    setup(c)
    install_pip_requirements(c)
    install_site(c)
    restart_services(c)


def setup(c):
    print('***Doing setup...***')
    c.sudo('apt update')
    c.sudo('apt install -y python3-pip nginx supervisor')
    c.sudo('mkdir -p %(path)s' % env)
    c.sudo('chown -R www-data:www-data %(path)s/' % env)
    c.run('mkdir -p %(upload_path)s' % env)
    c.run('cd %(upload_path)s; mkdir -p releases; mkdir -p packages' % env)


def install_pip_requirements(c):
    print('***Installing pip requirements...***')
    c.sudo('pip3 install -r %(upload_path)s/releases/%(release)s/requirements.txt'
         % env, pty=True)


def install_site(c):
    print('***Install site part 1... ***')
    c.sudo('cp -r %(upload_path)s/releases/%(release)s/* %(path)s/' % env)
    media_folder = '%(path)s/%(media_folder)s/' % env
    c.sudo('chown -R www-data:www-data %s' % media_folder)
    # c.sudo('if [ -a /etc/nginx/sites-enabled/default ]; then unlink /etc/nginx/sites-enabled/default; fi' % env)
    c.sudo('unlink /etc/nginx/sites-enabled/default' % env)
    c.sudo('cp %(path)s/deploy/speedtest_nginx_ssl.conf /etc/nginx/sites-enabled/' % env)
    c.sudo('cp %(path)s/deploy/speedtest_gunicorn.conf /etc/supervisor/conf.d/' % env)
    c.sudo('cp %(path)s/deploy/speedtest_gunicorn_start.sh /bin/' % env)


def restart_services(c):
    c.sudo('service supervisor restart')
    c.sudo('service nginx restart')
