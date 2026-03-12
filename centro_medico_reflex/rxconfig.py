import reflex as rx

config = rx.Config(
    app_name="centro_medico_reflex",
    db_url="sqlite:///medical_directory.db",
    plugins=[
        rx.plugins.SitemapPlugin(),
        rx.plugins.TailwindV4Plugin(),
    ]
)